import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService, EnvelopeService, FxService, LiabilityService, TransactionService } from '@patrimo/data-access';
import { fmtDate, fmtNum } from '@patrimo/ui';
import { computeRealized, startOfYearISO } from '../portfolio/realized-pnl';
import { computeTri } from '../portfolio/tri';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [],
  templateUrl: './report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportComponent {
  private readonly envelopes  = inject(EnvelopeService);
  private readonly liabilities = inject(LiabilityService);
  private readonly txService  = inject(TransactionService);
  private readonly auth       = inject(AuthService);
  private readonly fxService  = inject(FxService);

  protected readonly firstName = computed(() => this.auth.user()?.firstName ?? '');
  protected readonly todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  protected readonly totalValue       = this.envelopes.total;
  protected readonly totalLiabilities = this.liabilities.total;
  protected readonly netWorth         = computed(() => this.totalValue() - this.totalLiabilities());

  protected readonly envRows = computed(() =>
    this.envelopes.all()
      .filter(e => e.value > 0)
      .map(e => ({ ...e, pct: this.totalValue() > 0 ? (e.value / this.totalValue()) * 100 : 0 }))
      .sort((a, b) => b.value - a.value),
  );

  protected readonly liabilityRows = this.liabilities.all;

  protected readonly tri = computed(() => computeTri(this.txService.all(), this.totalValue()));
  protected readonly realizedYtd = computed(() =>
    computeRealized(this.txService.all(), startOfYearISO()).realizedSince,
  );

  protected readonly monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  protected readonly monthlyTx = computed(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.txService.all()
      .filter(t => t.date.slice(0, 7) === ym)
      .sort((a, b) => b.date.localeCompare(a.date));
  });
  protected readonly txLabels = this.txService.labels;

  protected getEnv(id: string) {
    return this.envelopes.all().find(e => e.id === id);
  }

  protected readonly fmtEur = (n: number, d = 0): string => this.fxService.fmt(n, d);
  protected readonly fmtNum  = fmtNum;
  protected readonly fmtDate = fmtDate;
  protected readonly abs     = Math.abs;

  protected print(): void {
    window.print();
  }
}
