import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CreateTransactionDto, TxTypeDto } from 'contracts';
import { EnvelopeService, EtfService, TransactionService, TxType, etfValue } from 'data-access';
import { fmtEur, fmtNum, fmtPctRaw } from 'ui';

type TxTypeEntry = { id: TxType; label: string; sym: string };

const TX_TYPES: TxTypeEntry[] = [
  { id: 'BUY',        label: 'Achat',     sym: '+' },
  { id: 'SELL',       label: 'Vente',     sym: '−' },
  { id: 'DEPOSIT',    label: 'Dépôt',     sym: '↘' },
  { id: 'WITHDRAWAL', label: 'Retrait',   sym: '↗' },
  { id: 'DIVIDEND',   label: 'Dividende', sym: '◆' },
  { id: 'INTEREST',   label: 'Intérêts',  sym: '◆' },
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
  private readonly envService  = inject(EnvelopeService);
  private readonly etfService  = inject(EtfService);
  private readonly txService   = inject(TransactionService);

  protected readonly types     = TX_TYPES;
  protected readonly envelopes = this.envService.all;
  protected readonly etfs      = this.etfService.all;

  protected type       = signal<TxType>('BUY');
  protected envelopeId = signal('');
  protected etfIsin    = signal('');
  protected qty        = signal(1);
  protected price      = signal(0);
  protected date       = signal(new Date().toISOString().slice(0, 10));
  protected fees       = signal(0);
  protected amount     = signal(0);

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);

  constructor() {
    // Seed selects from the first available envelope / ETF once the
    // signals are populated (auth-bound API hydration may complete after
    // the component is constructed).
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

  protected readonly showAsset    = computed(() => ['BUY','SELL','DIVIDEND'].includes(this.type()));
  protected readonly showQtyPrice = computed(() => ['BUY','SELL'].includes(this.type()));

  protected readonly selectedEnv = computed(() =>
    this.envelopes().find(e => e.id === this.envelopeId()) ?? this.envelopes()[0]
  );
  protected readonly selectedEtf = computed(() =>
    this.etfs().find(e => e.isin === this.etfIsin())
  );

  protected readonly txAmount = computed(() =>
    this.showQtyPrice() ? this.qty() * this.price() : this.amount()
  );
  protected readonly total = computed(() => {
    const t = this.type();
    return t === 'BUY' ? this.txAmount() + this.fees() : this.txAmount() - this.fees();
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

  protected close(): void { this.dialogRef.close(); }

  protected async save(): Promise<void> {
    const saved = await this.submit();
    if (saved) this.dialogRef.close('saved');
  }

  protected async saveAndNew(): Promise<void> {
    const saved = await this.submit();
    if (!saved) return;
    // Keep the dialog open; reset only the fields that should not carry over.
    this.qty.set(1);
    this.price.set(0);
    this.amount.set(0);
    this.fees.set(0);
  }

  private async submit(): Promise<boolean> {
    if (this.submitting()) return false;
    this.error.set(null);

    const env = this.selectedEnv();
    if (!env) { this.error.set('Aucune enveloppe sélectionnée'); return false; }

    const showAsset    = this.showAsset();
    const showQtyPrice = this.showQtyPrice();
    const etf          = showAsset ? this.selectedEtf() : null;

    if (showAsset && !etf) { this.error.set('Aucun ETF sélectionné'); return false; }

    const payload: CreateTransactionDto = {
      envelopeId: env.id,
      etfIsin: etf?.isin ?? null,
      type: this.type() as TxTypeDto,
      date: this.date(),
      quantity: showQtyPrice ? this.qty() : 1,
      price: showQtyPrice ? this.price() : null,
      fees: this.fees(),
      amount: this.txAmount(),
    };

    this.submitting.set(true);
    try {
      await this.txService.create(payload);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      this.error.set(msg);
      return false;
    } finally {
      this.submitting.set(false);
    }
  }
}
