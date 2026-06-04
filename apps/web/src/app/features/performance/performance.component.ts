import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PerformanceService } from 'data-access';
import { PerformancePeriod } from 'contracts';
import { DeltaComponent, fmtNum, fmtPct, fmtPctRaw } from 'ui';
import { PerfChartComponent } from '../dashboard/perf-chart.component';

const PERIOD_OPTIONS: { id: PerformancePeriod; label: string }[] = [
  { id: '1M',  label: '1M'  },
  { id: '3M',  label: '3M'  },
  { id: '6M',  label: '6M'  },
  { id: 'YTD', label: 'YTD' },
  { id: '1Y',  label: '1A'  },
];

interface PeriodRow { id: PerformancePeriod; label: string; pct: number; active: boolean }

const DD_DATA = [
  { date: 'oct. 2022', pct: -18.2, dur: '47 j', recov: '92 j' },
  { date: 'août 2023', pct:  -6.4, dur: '12 j', recov: '22 j' },
  { date: 'avr. 2024', pct:  -4.1, dur:  '9 j', recov: '14 j' },
];

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

  protected readonly portfolio = computed(() => this.perfSvc.series().portfolio);
  protected readonly benchmark = computed(() => this.perfSvc.series().benchmark);
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

  protected readonly periodRows = computed<PeriodRow[]>(() =>
    PERIOD_OPTIONS.map(opt => ({
      id: opt.id,
      label: opt.label,
      pct: opt.id === this.activePeriod() ? this.portfolioPct() : 0,
      active: opt.id === this.activePeriod(),
    })),
  );

  protected readonly ddData = DD_DATA;

  protected readonly fmtPct    = fmtPct;
  protected readonly fmtPctRaw = fmtPctRaw;
  protected readonly fmtNum    = fmtNum;

  protected setPeriod(period: PerformancePeriod): void {
    this.perfSvc.setPeriod(period);
  }
}
