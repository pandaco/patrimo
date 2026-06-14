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
import { fmtEur, fmtNum, fmtPctRaw } from '../format';

export interface TransactionDialogData {
  transaction?: Transaction;
  presetEnvelopeId?: string;
  presetEtfIsin?: string;
  presetType?: TransactionType;
}

type DialogTransactionType = TransactionType | 'TRANSFER';
type TransactionTypeEntry = { id: DialogTransactionType; label: string; sym: string };

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

  // Transfers are created as an atomic pair — editing a single leg would
  // unbalance the counterpart envelope, so the type is hidden in edit mode.
  protected readonly types     = this.data?.transaction ? TRANSACTION_TYPES.filter(t => t.id !== 'TRANSFER') : TRANSACTION_TYPES;
  protected readonly envelopes = this.envService.all;
  protected readonly etfs      = this.etfService.all;

  protected type       = signal<DialogTransactionType>(this.data?.transaction?.type ?? this.data?.presetType ?? 'BUY');
  protected targetEnvelopeId = signal('');
  protected envelopeId = signal(this.data?.transaction?.envelope ?? this.data?.presetEnvelopeId ?? '');
  protected etfIsin    = signal(this.data?.transaction?.etf ?? this.data?.presetEtfIsin ?? '');
  protected qty        = signal(this.data?.transaction?.qty ?? 1);
  protected price      = signal(this.data?.transaction?.price ?? 0);
  protected date       = signal(this.data?.transaction?.date ?? new Date().toISOString().slice(0, 10));
  protected fees       = signal(this.data?.transaction?.fees ?? 0);
  protected taxes      = signal(this.data?.transaction?.taxes ?? 0);
  protected amount     = signal(this.data?.transaction?.amount ?? 0);

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);

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
    this.showQtyPrice() ? this.qty() * this.price() : this.amount()
  );
  protected readonly total = computed(() => {
    const t = this.type();
    const costs = this.fees() + this.taxes();
    return t === 'BUY' ? this.txAmount() + costs : this.txAmount() - costs;
  });

  private readonly totalPortfolioValue = computed(() =>
    this.etfs().reduce((a, e) => a + etfValue(e), 0)
  );
  protected readonly currentWeight = computed(() => {
    const etf = this.selectedEtf();
    const tv  = this.totalPortfolioValue();
    return etf && tv ? (etfValue(etf) / tv) * 100 : 0;
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

  protected readonly fmtEur    = fmtEur;
  protected readonly fmtNum    = fmtNum;
  protected readonly fmtPctRaw = fmtPctRaw;

  protected openAddInstrument(): void {
    const ref = this.dialog.open(EtfDialogComponent, { panelClass: 'tx-dialog-panel', maxWidth: '580px', width: '100%' });
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
    this.price.set(0);
    this.amount.set(0);
    this.fees.set(0);
    this.taxes.set(0);
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
      if (this.amount() <= 0) { this.error.set('Montant invalide'); return false; }
      this.submitting.set(true);
      try {
        await this.txService.transfer({
          fromEnvelopeId: env.id,
          toEnvelopeId:   target,
          date:           this.date(),
          amount:         this.amount(),
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
      quantity: showQtyPrice ? this.qty() : 1,
      price: showQtyPrice ? this.price() : null,
      fees: this.fees(),
      taxes: this.taxes(),
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
