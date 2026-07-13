import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EnvelopeService, EtfService, TauxChangeService, PerformanceService, PreferencesService, TransactionService } from '@patrimo/data-access';
import { PerformancePeriod } from '@patrimo/contracts';
import { DeltaComponent, TipDirective, fmtNum, fmtPct, fmtPctRaw } from '@patrimo/ui';
import { PerfChartComponent } from '../dashboard/perf-chart.component';
import { computeTri } from '../portfolio/tauxRentabiliteInterne';

const PERIOD_OPTIONS: { id: PerformancePeriod; label: string }[] = [
  { id: '1W',  label: '1S'  },
  { id: '1M',  label: '1M'  },
  { id: '3M',  label: '3M'  },
  { id: '6M',  label: '6M'  },
  { id: 'YTD', label: 'YTD' },
  { id: '1Y',  label: '1A'  },
  { id: '3Y',  label: '3A'  },
  { id: '5Y',  label: '5A'  },
  { id: 'MAX', label: 'MAX' },
];

interface PeriodRow {
  id: PerformancePeriod;
  label: string;
  totalPct: number | null;
  annualizedPct: number | null;
  active: boolean;
}

interface MonthlyRow { year: number; months: (number | null)[]; yearTotal: number | null }
interface PeriodStats {
  volatility: number;
  sharpe: number | null;
  calmar: number | null;
  winRate: number;
  bestMonth:  { label: string; pct: number } | null;
  worstMonth: { label: string; pct: number } | null;
  monthlyRows: MonthlyRow[];
}

const MONTH_FR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

function shortFr(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_FR[d.getMonth()]} ${d.getFullYear()}`;
}

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [RouterLink, DeltaComponent, PerfChartComponent, TipDirective],
  templateUrl: './performance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceComponent {
  private readonly performanceService = inject(PerformanceService);
  private readonly etfService  = inject(EtfService);
  private readonly preferencesService = inject(PreferencesService);
  private readonly transactionService = inject(TransactionService);
  private readonly envelopeService = inject(EnvelopeService);

  // Human label of the user-selected benchmark, e.g. "CW8 — Amundi MSCI World".
  protected readonly benchmarkLabel = computed(() => {
    const isin = this.preferencesService.current().benchmarkIsin;
    const etf  = this.etfService.all().find(e => e.isin === isin);
    return etf ? `${etf.ticker} — ${etf.name}` : 'CW8 — MSCI World';
  });

  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly activePeriod  = this.performanceService.period;
  protected readonly loading       = this.performanceService.loading;

  protected readonly portfolio    = computed(() => this.performanceService.series().portfolio);
  protected readonly benchmark    = computed(() => this.performanceService.series().benchmark);
  protected readonly hasBenchmark = computed(() => this.benchmark().length > 0);

  private static totalReturn(series: number[]): number {
    if (series.length < 2) return 0;
    const start = series.find(v => v > 0) ?? 0;
    const end   = series[series.length - 1];
    // Same defensive guard as the dashboard portfolioPct: under €1 of base
    // capital the ratio is meaningless and prone to overflow into Infinity.
    if (start < 1) return 0;
    const ratio = (end / start - 1) * 100;
    return Number.isFinite(ratio) ? ratio : 0;
  }

  protected readonly portfolioPct = computed(() => PerformanceComponent.totalReturn(this.portfolio()));
  protected readonly benchmarkPct = computed(() => PerformanceComponent.totalReturn(this.benchmark()));
  protected readonly alphaPct     = computed(() => this.portfolioPct() - this.benchmarkPct());
  protected readonly annualized    = computed(() => this.performanceService.raw().annualized);
  protected readonly invested      = computed(() => this.performanceService.raw().invested);
  // Flow-neutral risk + return metrics (TWR, volatility, Sharpe, Sortino, max DD),
  // computed server-side from the daily series. Canonical — preferred over the
  // client-side estimates kept below for the monthly heatmap / win-rate only.
  protected readonly metrics       = this.performanceService.metrics;
  protected readonly loadingMetrics = this.performanceService.loadingMetrics;

  // ─── TWR vs TAUXRENTABILITEINTERNE (PP9) — le marché vs ton timing ───────────────────────────

  /** Money-weighted return (XIRR) since inception — annualised by construction. */
  protected readonly tauxRentabiliteInterne = computed(() =>
    computeTri(this.transactionService.all(), this.envelopeService.total()),
  );

  /**
   * Timing effect: TAUXRENTABILITEINTERNE − CAGR, in points per year. Only meaningful when both
   * figures cover the same span, i.e. the MAX period — TAUXRENTABILITEINTERNE always spans the
   * full history while the CAGR follows the active window.
   */
  protected readonly timingVerdict = computed(() => {
    if (this.activePeriod() !== 'MAX') return null;
    const tauxRentabiliteInterne  = this.tauxRentabiliteInterne();
    const cagr = this.annualized();
    if (tauxRentabiliteInterne === null || cagr === null) return null;
    return { deltaPts: tauxRentabiliteInterne - cagr, helped: tauxRentabiliteInterne >= cagr };
  });
  // Server-computed return per period (same replay as the chart), so every
  // row shows its value — not just the active one.
  protected readonly loadingPeriodReturns = this.performanceService.loadingPeriodReturns;
  protected readonly periodRows = computed<PeriodRow[]>(() => {
    const byPeriod = new Map(this.performanceService.periodReturns().map(r => [r.period, r]));
    return PERIOD_OPTIONS.map(opt => ({
      id: opt.id,
      label: opt.label,
      totalPct: byPeriod.get(opt.id)?.totalPct ?? null,
      annualizedPct: byPeriod.get(opt.id)?.annualizedPct ?? null,
      active: opt.id === this.activePeriod(),
    }));
  });

  protected readonly drawdowns = computed(() =>
    this.performanceService.raw().drawdowns.map(d => ({
      ...d,
      peakLabel:     shortFr(d.peakDate),
      troughLabel:   shortFr(d.troughDate),
      recoveryLabel: d.recoveryDate ? shortFr(d.recoveryDate) : 'ongoing',
    })),
  );

  protected readonly MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  protected readonly periodStats = computed((): PeriodStats | null => {
    const pts = this.portfolio();
    const lbs = this.performanceService.raw().labels;
    if (pts.length < 5 || lbs.length < 5) return null;

    const isWeekly  = (['3Y', '5Y', 'MAX'] as PerformancePeriod[]).includes(this.activePeriod());
    const annFactor = isWeekly ? 52 : 252;

    const returns: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i - 1] > 0 && pts[i] > 0) returns.push(pts[i] / pts[i - 1] - 1);
    }
    if (returns.length < 2) return null;

    const mean     = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance * annFactor) * 100;

    const rendementAnnuel = this.annualized();
    const annRet = rendementAnnuel ?? this.portfolioPct();
    const sharpe = volatility > 0 ? (annRet - 2.5) / volatility : null;

    const maxDD  = this.performanceService.raw().drawdowns[0]?.pct ?? null;
    const calmar = rendementAnnuel !== null && maxDD !== null && maxDD < 0
      ? rendementAnnuel / Math.abs(maxDD)
      : null;

    const winRate = (returns.filter(r => r > 0).length / returns.length) * 100;

    const monthlyMap = new Map<string, { start: number; end: number }>();
    for (let i = 0; i < lbs.length; i++) {
      if (pts[i] <= 0) continue;
      const key = lbs[i].slice(0, 7);
      const entry = monthlyMap.get(key);
      if (!entry) monthlyMap.set(key, { start: pts[i], end: pts[i] });
      else entry.end = pts[i];
    }

    const monthlyReturns = Array.from(monthlyMap.entries()).map(([key, { start, end }]) => ({
      year:  +key.slice(0, 4),
      month: +key.slice(5, 7),
      pct:   start > 0 ? (end / start - 1) * 100 : 0,
      label: key,
    }));

    let bestMonth:  { label: string; pct: number } | null = null;
    let worstMonth: { label: string; pct: number } | null = null;
    for (const m of monthlyReturns) {
      if (!bestMonth  || m.pct > bestMonth.pct)  bestMonth  = { label: m.label, pct: m.pct };
      if (!worstMonth || m.pct < worstMonth.pct) worstMonth = { label: m.label, pct: m.pct };
    }

    const years = [...new Set(monthlyReturns.map(m => m.year))].sort((a, b) => a - b);
    const monthlyRows: MonthlyRow[] = years.map(year => {
      const months: (number | null)[] = Array(12).fill(null);
      for (const m of monthlyReturns.filter(r => r.year === year)) months[m.month - 1] = m.pct;
      const filled = months.filter((m): m is number => m !== null);
      const yearTotal = filled.length > 0
        ? (filled.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100
        : null;
      return { year, months, yearTotal };
    });

    return { volatility, sharpe, calmar, winRate, bestMonth, worstMonth, monthlyRows };
  });

  protected heatmapBg(pct: number | null): string {
    if (pct === null) return 'transparent';
    const opacity = Math.min(Math.abs(pct) / 8, 0.65).toFixed(2);
    return pct >= 0
      ? `rgba(34,197,94,${opacity})`
      : `rgba(239,68,68,${opacity})`;
  }

  private readonly tauxChangeService = inject(TauxChangeService);
  // TAUXCHANGE-aware: converts EUR-base amounts into the display currency.
  protected readonly fmtEur = (n: number, d = 2): string => this.tauxChangeService.fmt(n, d);
  protected readonly abs       = Math.abs;
  protected readonly fmtPct    = fmtPct;
  protected readonly fmtPctRaw = fmtPctRaw;
  protected readonly fmtNum    = fmtNum;

  protected setPeriod(period: PerformancePeriod): void {
    this.performanceService.setPeriod(period);
  }
}
