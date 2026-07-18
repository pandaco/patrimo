import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CreateTransactionDto, EtfDto, TransactionTypeDto } from '@patrimo/contracts';
import {
  Envelope,
  EnvelopeService,
  EtfService,
  Transaction,
  TransactionService,
  TransactionType,
  etfValue,
} from '@patrimo/data-access';
import { EtfDialogComponent } from '../etf-dialog/etf-dialog.component';
import { formatEuro, formatNumber, formatPercentRaw } from '../format';

export interface TransactionDialogData {
  transaction?: Transaction;
  /** Pré-remplit tous les champs depuis une opération existante, mais crée
   *  un nouveau mouvement daté d'aujourd'hui (bouton « Dupliquer »). */
  duplicateFrom?: Transaction;
  presetEnvelopeId?: string;
  presetEtfIsin?: string;
  presetType?: TransactionType;
}

type DialogTransactionType = TransactionType | 'TRANSFER';
type TransactionTypeEntry = { id: DialogTransactionType; label: string; sym: string };

// Barème courtage Fortuneo : 0,99 € jusqu'à 500 €, 0,35 % au-delà.
export function brokerageFee(amount: number): number {
  if (amount <= 0) return 0;
  return amount <= 500 ? 0.99 : Math.round(amount * 0.35) / 100;
}

const TRANSACTION_TYPES: TransactionTypeEntry[] = [
  { id: 'BUY',        label: 'Achat',     sym: '+' },
  { id: 'SELL',       label: 'Vente',     sym: '−' },
  { id: 'DEPOSIT',    label: 'Dépôt',     sym: '↘' },
  { id: 'WITHDRAWAL', label: 'Retrait',   sym: '↗' },
  { id: 'DIVIDEND',   label: 'Dividende', sym: '€' },
  { id: 'INTEREST',   label: 'Intérêts',  sym: '%' },
  { id: 'TRANSFER',   label: 'Transfert', sym: '⇄' },
];

@Component({
  selector: 'app-transaction-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './transaction-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDialogComponent {
  private readonly dialogRef   = inject(MatDialogRef<TransactionDialogComponent>);
  private readonly data        = inject<TransactionDialogData>(MAT_DIALOG_DATA, { optional: true });
  private readonly dialog      = inject(MatDialog);
  private readonly envService  = inject(EnvelopeService);
  private readonly etfService  = inject(EtfService);
  private readonly txService   = inject(TransactionService);

  protected readonly editing   = !!this.data?.transaction;
  private readonly editingId   = this.data?.transaction?.id ?? null;

  // Une duplication reprend tous les champs de la source mais crée un
  // mouvement neuf : date du jour, prix et frais recalculés au cours actuel.
  private readonly source = this.data?.transaction ?? this.data?.duplicateFrom;

  // Transfers are created as an atomic pair — editing a single leg would
  // unbalance the counterpart envelope, so the type is hidden in edit mode.
  protected readonly types     = this.data?.transaction ? TRANSACTION_TYPES.filter(t => t.id !== 'TRANSFER') : TRANSACTION_TYPES;
  protected readonly envelopes = this.envService.all;
  protected readonly etfs      = this.etfService.all;

  protected type       = signal<DialogTransactionType>(this.source?.type ?? this.data?.presetType ?? 'BUY');
  protected targetEnvelopeId = signal('');
  protected envelopeId = signal(this.source?.envelope ?? this.data?.presetEnvelopeId ?? '');
  protected etfIsin    = signal(this.source?.etf ?? this.data?.presetEtfIsin ?? '');
  protected qty        = signal<number | null>(this.source?.qty ?? 1);
  protected price      = signal<number | null>(this.source?.price ?? null);
  protected date       = signal(this.data?.transaction?.date ?? new Date().toISOString().slice(0, 10));
  protected fees       = signal<number | null>(this.source?.fees ?? 0);
  protected taxes      = signal<number | null>(this.source?.taxes ?? 0);
  protected amount     = signal<number | null>(this.source?.amount ?? null);

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);

  // Les frais suivent le barème tant que l'utilisateur n'a pas saisi de valeur.
  protected readonly feesManual = signal(this.editing);
  protected readonly showAdvanced = signal(this.editing && ((this.source?.taxes ?? 0) > 0 || this.feesManual()));

  private lastPrefilledIsin: string | null = null;

  constructor() {
    // Only auto-seed selects when creating; an edit always pre-fills the
    // identifiers from the source transaction.
    if (!this.editing) {
      effect(() => {
        if (!this.envelopeId() && this.envelopes().length > 0) {
          this.envelopeId.set(this.envelopes()[0].id);
        }
      });
      effect(() => {
        if (!this.etfIsin() && this.etfs().length > 0) {
          this.etfIsin.set(this.etfs()[0].isin);
        }
      });
      // Pré-remplit le prix avec le dernier cours connu à chaque changement
      // d'instrument — l'utilisateur garde la main pour le corriger.
      effect(() => {
        const etf = this.selectedEtf();
        if (!etf || etf.isin === this.lastPrefilledIsin) return;
        this.lastPrefilledIsin = etf.isin;
        if (etf.price > 0) this.price.set(etf.price);
      });
      // Frais courtage au barème (Fortuneo) recalculés sur le montant,
      // jusqu'à la première saisie manuelle. Remis à zéro quand le type
      // de mouvement n'a pas de frais de courtage.
      effect(() => {
        if (this.feesManual()) return;
        this.fees.set(this.showQtyPrice() ? brokerageFee(this.txAmount()) : 0);
      });
    }
  }

  protected readonly isTransfer   = computed(() => this.type() === 'TRANSFER');
  protected readonly showAsset    = computed(() => ['BUY','SELL','DIVIDEND'].includes(this.type()));
  protected readonly showQtyPrice = computed(() => ['BUY','SELL'].includes(this.type()));

  protected readonly selectedEnv = computed<Envelope | undefined>(() => {
    const list = this.envelopes();
    return list.find(e => e.id === this.envelopeId()) ?? list[0];
  });
  protected readonly selectedEtf = computed(() =>
    this.etfs().find(e => e.isin === this.etfIsin())
  );

  protected readonly txAmount = computed(() =>
    this.showQtyPrice() ? (this.qty() ?? 0) * (this.price() ?? 0) : (this.amount() ?? 0)
  );
  protected readonly total = computed(() => {
    const t = this.type();
    const costs = (this.fees() ?? 0) + (this.taxes() ?? 0);
    return t === 'BUY' ? this.txAmount() + costs : this.txAmount() - costs;
  });

  private readonly totalPortfolioValue = computed(() =>
    this.etfs().reduce((a, e) => a + etfValue(e), 0)
  );
  protected readonly currentWeight = computed(() => {
    const etf = this.selectedEtf();
    const totalValue  = this.totalPortfolioValue();
    return etf && totalValue ? (etfValue(etf) / totalValue) * 100 : 0;
  });
  protected readonly newWeight = computed(() => {
    const etf = this.selectedEtf();
    if (!etf) return 0;
    const amt   = this.txAmount();
    const denom = this.totalPortfolioValue() + amt;
    return denom ? ((etfValue(etf) + amt) / denom) * 100 : 0;
  });
  protected readonly targetWeight = computed(() => 0);
  protected readonly cashAfter = computed(() => {
    const env = this.selectedEnv();
    if (!env) return 0;
    return env.cash + (this.type() === 'BUY' ? -this.total() : this.total());
  });
  protected readonly cashInsufficient = computed(
    () => this.type() === 'BUY' && this.cashAfter() < 0
  );

  protected onFeesInput(value: number | null): void {
    this.feesManual.set(true);
    this.fees.set(value);
  }

  protected resetFeesToAuto(): void {
    this.feesManual.set(false);
    this.fees.set(this.showQtyPrice() ? brokerageFee(this.txAmount()) : 0);
  }

  protected readonly formatEuro    = formatEuro;
  protected readonly formatNumber    = formatNumber;
  protected readonly formatPercentRaw = formatPercentRaw;

  protected openAddInstrument(): void {
    const ref = this.dialog.open(EtfDialogComponent, { panelClass: 'transaction-dialog-panel', maxWidth: 'min(580px, calc(100vw - 24px))', width: '100%' });
    ref.afterClosed().subscribe((created: EtfDto | undefined) => {
      if (created) this.etfIsin.set(created.isin);
    });
  }

  protected close(): void { this.dialogRef.close(); }

  protected async save(): Promise<void> {
    const saved = await this.submit();
    if (saved) this.dialogRef.close('saved');
  }

  protected async saveAndNew(): Promise<void> {
    if (this.editing) return; // "Save + new" is meaningless in edit mode.
    const saved = await this.submit();
    if (!saved) return;
    this.qty.set(1);
    this.price.set(this.selectedEtf()?.price ?? null);
    this.amount.set(null);
    this.taxes.set(0);
    this.feesManual.set(false);
    this.fees.set(this.showQtyPrice() ? brokerageFee(this.txAmount()) : 0);
  }

  private async submit(): Promise<boolean> {
    if (this.submitting()) return false;
    this.error.set(null);

    const env = this.selectedEnv();
    if (!env) { this.error.set('Aucune enveloppe sélectionnée'); return false; }

    if (this.isTransfer()) {
      const target = this.targetEnvelopeId();
      if (!target || target === env.id) {
        this.error.set('Choisis une enveloppe de destination différente');
        return false;
      }
      if ((this.amount() ?? 0) <= 0) { this.error.set('Montant invalide'); return false; }
      this.submitting.set(true);
      try {
        await this.txService.transfer({
          fromEnvelopeId: env.id,
          toEnvelopeId:   target,
          date:           this.date(),
          amount:         this.amount() ?? 0,
        });
        return true;
      } catch (err) {
        this.error.set(err instanceof Error ? err.message : 'Erreur lors du transfert');
        return false;
      } finally {
        this.submitting.set(false);
      }
    }

    const showAsset    = this.showAsset();
    const showQtyPrice = this.showQtyPrice();
    const etf          = showAsset ? this.selectedEtf() : null;

    if (showAsset && !etf) { this.error.set('Aucun ETF sélectionné'); return false; }

    const payload: CreateTransactionDto = {
      envelopeId: env.id,
      etfIsin: etf?.isin ?? null,
      type: this.type() as TransactionTypeDto, // TRANSFER handled above — only real transaction types reach here
      date: this.date(),
      quantity: showQtyPrice ? (this.qty() ?? 1) : 1,
      price: showQtyPrice ? (this.price() ?? 0) : null,
      fees: this.fees() ?? 0,
      taxes: this.taxes() ?? 0,
      amount: this.txAmount(),
    };

    this.submitting.set(true);
    try {
      if (this.editing && this.editingId) {
        await this.txService.update(this.editingId, payload);
      } else {
        await this.txService.create(payload);
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      this.error.set(msg);
      return false;
    } finally {
      this.submitting.set(false);
    }
  }
}
