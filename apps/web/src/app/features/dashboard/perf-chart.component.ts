import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const W = 700, H = 220, P = 20;

@Component({
  selector: 'app-perf-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + (H + 20)" style="width:100%;height:auto;display:block">
      @for (y of gridY(); track $index) {
        <line [attr.x1]="P" [attr.x2]="W - P" [attr.y1]="y" [attr.y2]="y"
          stroke="var(--rule-soft)" [attr.stroke-dasharray]="$last ? 'none' : '2 4'" />
      }
      <polygon [attr.points]="areaPts()" fill="var(--brand)" opacity="0.07" />
      <polyline [attr.points]="benchPts()" fill="none" stroke="var(--ink-3)"
        stroke-width="1.2" stroke-dasharray="3 4" />
      <polyline [attr.points]="portfolioPts()" fill="none" stroke="var(--brand)" stroke-width="2" />
      <circle [attr.cx]="endX()" [attr.cy]="endY()" r="4"
        fill="var(--brand)" stroke="var(--paper)" stroke-width="2" />
      <text [attr.x]="endX() - 8" [attr.y]="endY() - 10"
        font-size="11" font-family="var(--font-mono)" fill="var(--brand-ink)" text-anchor="end">{{ perfLabel() }}</text>
      @for (label of xLabels; track label; let i = $index) {
        <text
          [attr.x]="P + (i / (xLabels.length - 1)) * (W - P * 2)"
          [attr.y]="H + 10"
          font-size="10" fill="var(--ink-3)" text-anchor="middle">{{ label }}</text>
      }
      <g [attr.transform]="'translate(' + (P + 8) + ' ' + (P + 8) + ')'">
        <line x1="0" x2="14" y1="3" y2="3" stroke="var(--brand)" stroke-width="2" />
        <text x="20" y="6" font-size="11" fill="var(--ink-2)">Portefeuille</text>
        <line x1="100" x2="114" y1="3" y2="3" stroke="var(--ink-3)" stroke-width="1.2" stroke-dasharray="3 4" />
        <text x="120" y="6" font-size="11" fill="var(--ink-2)">MSCI World</text>
      </g>
    </svg>
  `,
})
export class PerfChartComponent {
  portfolio = input.required<number[]>();
  benchmark = input.required<number[]>();

  protected readonly W = W;
  protected readonly H = H;
  protected readonly P = P;

  readonly xLabels = ['1A', '9M', '6M', '3M', '1M', 'Auj.'];

  private minMax = computed(() => {
    const all = [...this.portfolio(), ...this.benchmark()];
    return { min: Math.min(...all) - 2, max: Math.max(...all) + 2 };
  });

  private toY = (v: number) => {
    const { min, max } = this.minMax();
    return H - P - ((v - min) / (max - min)) * (H - P * 2);
  };

  protected portfolioPts = computed(() => {
    const { min, max } = this.minMax();
    return this.portfolio().map((v, i) => {
      const x = P + (i / (this.portfolio().length - 1)) * (W - P * 2);
      const y = H - P - ((v - min) / (max - min)) * (H - P * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  });

  protected benchPts = computed(() => {
    const { min, max } = this.minMax();
    return this.benchmark().map((v, i) => {
      const x = P + (i / (this.benchmark().length - 1)) * (W - P * 2);
      const y = H - P - ((v - min) / (max - min)) * (H - P * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  });

  protected areaPts = computed(() => `${P},${H - P} ${this.portfolioPts()} ${W - P},${H - P}`);

  protected gridY = computed(() =>
    [0, 0.25, 0.5, 0.75, 1].map(t => H - P - t * (H - P * 2))
  );

  protected endX = computed(() => {
    const n = this.portfolio().length;
    return P + ((n - 1) / (n - 1)) * (W - P * 2);
  });

  protected endY = computed(() => {
    const d = this.portfolio();
    const { min, max } = this.minMax();
    return H - P - ((d[d.length - 1] - min) / (max - min)) * (H - P * 2);
  });

  protected perfLabel = computed(() => {
    const d = this.portfolio();
    const gain = (d[d.length - 1] / d[0] - 1) * 100;
    return (gain >= 0 ? '+' : '') + gain.toFixed(1).replace('.', ',') + '%';
  });
}
