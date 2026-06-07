import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const W = 700, H = 220, P = 20;

@Component({
  selector: 'app-perf-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + (H + 20)"
         style="width:100%;height:auto;display:block"
         (mousemove)="onMove($event)"
         (mouseleave)="hover.set(null)">
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

      @if (hover(); as h) {
        <line [attr.x1]="h.x" [attr.x2]="h.x" [attr.y1]="P" [attr.y2]="H - P"
              stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="2 3" />
        <circle [attr.cx]="h.x" [attr.cy]="h.yPort" r="3.5"
                fill="var(--brand)" stroke="var(--paper)" stroke-width="1.5" />
        <circle [attr.cx]="h.x" [attr.cy]="h.yBench" r="3"
                fill="var(--ink-3)" stroke="var(--paper)" stroke-width="1.5" />

        <g [attr.transform]="'translate(' + h.tipX + ' ' + (P + 4) + ')'">
          <rect x="0" y="0" rx="6" ry="6" width="124" height="44"
                fill="var(--ink)" opacity="0.92" />
          <text x="10" y="16" font-size="10" fill="rgba(255,255,255,0.65)">{{ h.label }}</text>
          <text x="10" y="30" font-size="11" font-family="var(--font-mono)" fill="#fff">
            <tspan>Portef. </tspan>
            <tspan font-weight="600">{{ h.portStr }}</tspan>
          </text>
          <text x="10" y="40" font-size="10" font-family="var(--font-mono)" fill="rgba(255,255,255,0.75)">
            <tspan>MSCI </tspan>
            <tspan>{{ h.benchStr }}</tspan>
          </text>
        </g>
      }
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

  protected readonly hover = signal<{
    x: number; yPort: number; yBench: number;
    label: string; portStr: string; benchStr: string;
    tipX: number;
  } | null>(null);

  private minMax = computed(() => {
    const all = [...this.portfolio(), ...this.benchmark()];
    if (all.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...all) - 2, max: Math.max(...all) + 2 };
  });

  protected portfolioPts = computed(() => this.toPoints(this.portfolio()));
  protected benchPts     = computed(() => this.toPoints(this.benchmark()));

  private toPoints(series: number[]): string {
    const { min, max } = this.minMax();
    return series.map((v, i) => {
      const x = P + (i / (series.length - 1)) * (W - P * 2);
      const y = H - P - ((v - min) / (max - min)) * (H - P * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

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
    if (d.length < 2 || d[0] === 0) return '—';
    const gain = (d[d.length - 1] / d[0] - 1) * 100;
    if (!Number.isFinite(gain)) return '—';
    return (gain >= 0 ? '+' : '') + gain.toFixed(1).replace('.', ',') + '%';
  });

  protected onMove(event: MouseEvent): void {
    const port  = this.portfolio();
    const bench = this.benchmark();
    if (port.length < 2) { this.hover.set(null); return; }

    const svgEl = event.currentTarget as SVGSVGElement | null;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    // Map screen x → svg viewBox x.
    const ratio = W / rect.width;
    const svgX = (event.clientX - rect.left) * ratio;
    if (svgX < P || svgX > W - P) { this.hover.set(null); return; }

    const t = (svgX - P) / (W - 2 * P);
    const idx = Math.round(t * (port.length - 1));
    const clamped = Math.max(0, Math.min(port.length - 1, idx));

    const x = P + (clamped / (port.length - 1)) * (W - 2 * P);
    const { min, max } = this.minMax();
    const yFor = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);

    const vPort  = port[clamped];
    const vBench = bench[clamped] ?? port[clamped];

    // Anchor the tooltip on the side opposite the cursor so the line stays visible.
    const tipX = x > W / 2 ? Math.max(P, x - 134) : Math.min(W - P - 124, x + 10);

    this.hover.set({
      x,
      yPort:  yFor(vPort),
      yBench: yFor(vBench),
      label:  this.xLabelAt(clamped, port.length),
      portStr:  this.fmt(vPort),
      benchStr: this.fmt(vBench),
      tipX,
    });
  }

  private fmt(v: number): string {
    return v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' €';
  }

  private xLabelAt(idx: number, n: number): string {
    // Approximate the calendar bucket the cursor lands on. The fixed
    // `xLabels` array spans 1A → Auj., so we interpolate the matching
    // bucket from the sample index.
    if (n <= 1) return 'Auj.';
    const t = idx / (n - 1);
    const i = Math.round(t * (this.xLabels.length - 1));
    return this.xLabels[i];
  }
}
