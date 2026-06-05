import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertService, EnvelopeService, EtfService, PerformanceService, TransactionService, etfCost, etfValue } from '@patrimo/data-access';
import { DeltaComponent, DonutComponent, EnvGlyphComponent, fmtDate, fmtEur, fmtNum, fmtPct, fmtPctRaw } from '@patrimo/ui';
import { PerfChartComponent } from './perf-chart.component';

const GLYPH_COLORS: Record<string, string> = {
  pea:'#16A34A', peapme:'#15803D', cto:'#EA580C', av:'#7C3AED',
  per:'#475569', pee:'#0284C7', livret:'#CA8A04', crypto:'#18181B',
  immo:'#DC2626', metal:'#B45309',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DeltaComponent, DonutComponent, EnvGlyphComponent, PerfChartComponent],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly envelopes  = inject(EnvelopeService);
  private readonly etfs       = inject(EtfService);
  private readonly txService  = inject(TransactionService);
  private readonly alerts     = inject(AlertService);
  private readonly perfSvc    = inject(PerformanceService);

  protected readonly envAll       = this.envelopes.all;
  protected readonly envLoading   = this.envelopes.loading;
  protected readonly totalValue   = this.envelopes.total;
  protected readonly totalBourse  = this.envelopes.totalBourse;
  protected readonly totalLivret  = this.envelopes.totalLivret;
  protected readonly totalCash    = this.envelopes.totalCash;
  protected readonly totalInvested = this.envelopes.totalInvested;

  protected readonly portfolioValue = computed(() =>
    this.etfs.all().reduce((a, e) => a + etfValue(e), 0)
  );
  protected readonly portfolioCost = computed(() =>
    this.etfs.all().reduce((a, e) => a + etfCost(e), 0)
  );
  protected readonly pnlPct = computed(() => {
    const cost = this.portfolioCost();
    return cost ? (this.portfolioValue() / cost - 1) * 100 : 0;
  });
  protected readonly dayValue = computed(() =>
    this.etfs.all().reduce((a, e) => a + (e.price - e.prev) * e.qty, 0)
  );
  protected readonly dayPct = computed(() => {
    const value = this.portfolioValue();
    return value ? (this.dayValue() / value) * 100 : 0;
  });

  protected readonly topAlerts    = computed(() => this.alerts.all().slice(0, 3));
  protected readonly recentTx     = computed(() => this.txService.all().slice(0, 5));
  protected readonly txLabels     = this.txService.labels;

  protected readonly perfPortfolio = computed(() => this.perfSvc.series().portfolio);
  protected readonly perfBenchmark = computed(() => this.perfSvc.series().benchmark);

  protected readonly donutData = computed(() =>
    this.envelopes.all().map(e => ({ value: e.value, color: GLYPH_COLORS[e.glyph] ?? '#999' }))
  );

  protected readonly envPreview = computed(() => this.envelopes.all().slice(0, 6));

  protected readonly fmtEur    = fmtEur;
  protected readonly fmtNum    = fmtNum;
  protected readonly fmtPct    = fmtPct;
  protected readonly fmtPctRaw = fmtPctRaw;
  protected readonly fmtDate   = fmtDate;

  protected getEnv(id: string) {
    return this.envelopes.all().find(e => e.id === id);
  }

  protected getEtf(isin: string | null) {
    return isin ? this.etfs.all().find(e => e.isin === isin) : null;
  }

  protected sevClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : 'info';
  }

  protected sevIcon(sev: string): string {
    return sev === 'warn' ? '!' : sev === 'gain' ? '✓' : 'i';
  }
}
