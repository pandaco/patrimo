import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PerformanceService } from 'data-access';
import { BarComponent, DeltaComponent, fmtNum, fmtPct, fmtPctRaw } from 'ui';
import { PerfChartComponent } from '../dashboard/perf-chart.component';

const PERIODS = [
  { p:'1J',  port: 0.62, bench: 0.41, ann: false },
  { p:'1S',  port: 1.84, bench: 1.62, ann: false },
  { p:'1M',  port: 3.42, bench: 2.91, ann: false },
  { p:'3M',  port: 6.18, bench: 5.42, ann: false },
  { p:'6M',  port:11.4,  bench: 9.81, ann: false },
  { p:'YTD', port: 8.42, bench: 7.34, ann: false },
  { p:'1A',  port:19.6,  bench:17.2,  ann: false },
  { p:'3A',  port:12.4,  bench:11.1,  ann: true  },
  { p:'5A',  port:10.8,  bench: 9.6,  ann: true  },
  { p:'MAX', port: 9.42, bench: 8.41, ann: true  },
];

const TD_DATA = [
  { ticker:'ESE',   td:-0.02, te:0.08 },
  { ticker:'CW8',   td:-0.18, te:0.21 },
  { ticker:'PCEU',  td: 0.04, te:0.06 },
  { ticker:'PAEEM', td:-0.32, te:0.34 },
  { ticker:'RS2K',  td:-0.22, te:0.41 },
];

const DD_DATA = [
  { date:'oct. 2022', pct:-18.2, dur:'47 j', recov:'92 j' },
  { date:'août 2023', pct: -6.4, dur:'12 j', recov:'22 j' },
  { date:'avr. 2024', pct: -4.1, dur: '9 j', recov:'14 j' },
];

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [BarComponent, DeltaComponent, PerfChartComponent],
  templateUrl: './performance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceComponent {
  private readonly perfSvc = inject(PerformanceService);

  protected readonly periods   = PERIODS;
  protected readonly tdData    = TD_DATA;
  protected readonly ddData    = DD_DATA;

  protected readonly portfolio = computed(() => this.perfSvc.series().portfolio);
  protected readonly benchmark = computed(() => this.perfSvc.series().benchmark);

  protected readonly fmtPct    = fmtPct;
  protected readonly fmtPctRaw = fmtPctRaw;
  protected readonly fmtNum    = fmtNum;
}
