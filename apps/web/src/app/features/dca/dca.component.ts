import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AllocationService, EnvelopeService, EtfService, etfValue } from 'data-access';
import { BarComponent, EnvGlyphComponent, fmtEur, fmtNum, fmtPctRaw } from 'ui';

@Component({
  selector: 'app-dca',
  standalone: true,
  imports: [FormsModule, BarComponent, EnvGlyphComponent],
  templateUrl: './dca.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DcaComponent {
  private readonly etfSvc   = inject(EtfService);
  private readonly allocSvc = inject(AllocationService);
  private readonly envSvc   = inject(EnvelopeService);
  private readonly dialog   = inject(MatDialog);

  protected readonly amount     = signal(800);
  protected readonly correction = signal(true);
  protected readonly envelopeId = signal('pea');

  protected readonly presets    = [300, 500, 800, 1000, 1500, 2000];
  protected readonly envelopes  = computed(() =>
    this.envSvc.all().filter(e => ['pea','peapme','cto','av','per'].includes(e.id))
  );

  private readonly etfsWithTargets = computed(() =>
    this.etfSvc.all().filter(e => this.allocSvc.targets().etf[e.ticker] != null)
  );

  private readonly total = computed(() =>
    this.etfsWithTargets().reduce((a, e) => a + etfValue(e), 0)
  );

  protected readonly rows = computed(() => {
    const etfs = this.etfsWithTargets();
    const total = this.total();
    const amount = this.amount();
    const correction = this.correction();
    const targets = this.allocSvc.targets().etf;

    return etfs.map(e => {
      const target   = targets[e.ticker];
      const realPct  = etfValue(e) / total * 100;
      const drift    = realPct - target;
      let weight: number;
      if (correction) {
        const targetValue = (target / 100) * (total + amount);
        weight = Math.max(0, targetValue - etfValue(e));
      } else {
        weight = (target / 100) * amount;
      }
      return { e, target, realPct, drift, weight };
    });
  });

  protected readonly normalized = computed(() => {
    const rows  = this.rows();
    const total = rows.reduce((a, r) => a + r.weight, 0) || 1;
    const amount = this.amount();
    return rows.map(r => ({ ...r, eur: (r.weight / total) * amount }));
  });

  protected readonly totalSpent = computed(() =>
    this.normalized().reduce((a, r) => a + Math.floor(r.eur / r.e.price) * r.e.price, 0)
  );
  protected readonly totalQty = computed(() =>
    this.normalized().reduce((a, r) => a + Math.floor(r.eur / r.e.price), 0)
  );

  protected readonly pea = computed(() => this.envSvc.all().find(e => e.id === 'pea'));
  protected readonly cashAfter = computed(() => {
    const pea = this.pea();
    return pea ? pea.cash - this.totalSpent() : 0;
  });

  protected readonly fmtEur    = fmtEur;
  protected readonly fmtNum    = fmtNum;
  protected readonly fmtPctRaw = fmtPctRaw;

  protected qty(eur: number, price: number) { return Math.floor(eur / price); }
  protected cost(eur: number, price: number) { return this.qty(eur, price) * price; }

  protected async openNewTx(): Promise<void> {
    const { TransactionDialogComponent } = await import('../../shared/transaction-dialog/transaction-dialog.component');
    this.dialog.open(TransactionDialogComponent, {
      panelClass: 'tx-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }
}
