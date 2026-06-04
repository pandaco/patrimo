import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { EnvelopeService, EtfService, TxType, etfValue } from 'data-access';
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

  protected readonly types     = TX_TYPES;
  protected readonly envelopes = this.envService.all;
  protected readonly etfs      = this.etfService.all;

  protected type       = signal<TxType>('BUY');
  protected envelopeId = signal('pea');
  protected etfTicker  = signal('ESE');
  protected qty        = signal(17);
  protected price      = signal(39.42);
  protected date       = signal(new Date().toISOString().slice(0, 10));
  protected fees       = signal(0.99);
  protected amount     = signal(500);

  protected readonly showAsset    = computed(() => ['BUY','SELL','DIVIDEND'].includes(this.type()));
  protected readonly showQtyPrice = computed(() => ['BUY','SELL'].includes(this.type()));

  protected readonly selectedEnv = computed(() =>
    this.envelopes().find(e => e.id === this.envelopeId()) ?? this.envelopes()[0]
  );
  protected readonly selectedEtf = computed(() =>
    this.etfs().find(e => e.ticker === this.etfTicker())
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
  protected save(): void  { this.dialogRef.close('saved'); }
  protected saveAndNew(): void { this.dialogRef.close('saved-new'); }
}
