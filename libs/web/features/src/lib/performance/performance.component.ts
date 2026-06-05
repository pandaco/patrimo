import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PerformanceService } from '@patrimo/data-access';
import { PerformancePeriod } from '@patrimo/contracts';
import { DeltaComponent, fmtEur, fmtNum, fmtPct, fmtPctRaw } from '@patrimo/ui';
import { PerfChartComponent } from '../dashboard/perf-chart.component';

const PERIOD_OPTIONS: { id: PerformancePeriod; label: string }[] = [
  { id: '1M',  label: '1M'  },
  { id: '3M',  label: '3M'  },
  { id: '6M',  label: '6M'  },
  { id: 'YTD', label: 'YTD' },
  { id: '1Y',  label: '1A'  },
  { id: '3Y',  label: '3A'  },
  { id: '5Y',  label: '5A'  },
  { id: 'MAX', label: 'MAX' },
];

interface PeriodRow { id: PerformancePeriod; label: string; pct: number; active: boolean }

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
  imports: [DeltaComponent, PerfChartComponent],
  templateUrl: './performance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceComponent {
  private readonly perfSvc = inject(PerformanceService);

  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly activePeriod  = this.perfSvc.period;
  protected readonly loading       = this.perfSvc.loading;

  protected readonly portfolio    = computed(() => this.perfSvc.series().portfolio);
  protected readonly benchmark    = computed(() => this.perfSvc.series().benchmark);
  protected readonly hasBenchmark = computed(() => this.benchmark().length > 0);

  private static totalReturn(series: number[]): number {
    if (series.length < 2) return 0;
    const start = series.find(v => v > 0) ?? 0;
    const end   = series[series.length - 1];
    return start ? (end / start - 1) * 100 : 0;
  }

  protected readonly portfolioPct = computed(() => PerformanceComponent.totalReturn(this.portfolio()));
  protected readonly benchmarkPct = computed(() => PerformanceComponent.totalReturn(this.benchmark()));
  protected readonly alphaPct     = computed(() => this.portfolioPct() - this.benchmarkPct());
  protected readonly annualized    = computed(() => this.perfSvc.raw().annualized);
  protected readonly etfStats      = this.perfSvc.etfStats;
  protected readonly fees          = this.perfSvc.fees;
  protected readonly loadingStats  = this.perfSvc.loadingStats;
  protected readonly loadingFees   = this.perfSvc.loadingFees;

  protected readonly periodRows = computed<PeriodRow[]>(() =>
    PERIOD_OPTIONS.map(opt => ({
      id: opt.id,
      label: opt.label,
      pct: opt.id === this.activePeriod() ? this.portfolioPct() : 0,
      active: opt.id === this.activePeriod(),
    })),
  );

  protected readonly drawdowns = computed(() =>
    this.perfSvc.raw().drawdowns.map(d => ({
      ...d,
      peakLabel:     shortFr(d.peakDate),
      troughLabel:   shortFr(d.troughDate),
      recoveryLabel: d.recoveryDate ? shortFr(d.recoveryDate) : 'ongoing',
    })),
  );

  protected readonly MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  protected readonly periodStats = computed((): PeriodStats | null => {
    const pts = this.portfolio();
    const lbs = this.perfSvc.raw().labels;
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

    const annVal = this.annualized();
    const annRet = annVal ?? this.portfolioPct();
    const sharpe = volatility > 0 ? (annRet - 2.5) / volatility : null;

    const maxDD  = this.perfSvc.raw().drawdowns[0]?.pct ?? null;
    const calmar = annVal !== null && maxDD !== null && maxDD < 0
      ? annVal / Math.abs(maxDD)
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

  protected readonly fmtEur    = fmtEur;
  protected readonly fmtPct    = fmtPct;
  protected readonly fmtPctRaw = fmtPctRaw;
  protected readonly fmtNum    = fmtNum;

  protected setPeriod(period: PerformancePeriod): void {
    this.perfSvc.setPeriod(period);
  }
}
