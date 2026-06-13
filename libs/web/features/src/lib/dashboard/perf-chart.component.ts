import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const W = 700, H = 220, P = 20;

interface HoverState {
  /** Pixel X within the host element (for the HTML tooltip). */
  hostX: number;
  hostY: number;
  /** SVG coords (viewBox units) for the guide line and dots. */
  svgX: number;
  yPort: number;
  yBench: number;
  label:    string;
  portStr:  string;
  benchStr: string;
}

@Component({
  selector: 'app-perf-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-host" style="display:block;width:100%">
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
        @if (invested().length > 0) {
          <polyline [attr.points]="investedPts()" fill="none" stroke="var(--ink-4)"
            stroke-width="1.2" stroke-dasharray="5 3" />
        }
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
          @if (invested().length > 0) {
            <line x1="210" x2="224" y1="3" y2="3" stroke="var(--ink-4)" stroke-width="1.2" stroke-dasharray="5 3" />
            <text x="230" y="6" font-size="11" fill="var(--ink-2)">Investi</text>
          }
        </g>

        @if (hover(); as h) {
          <line [attr.x1]="h.svgX" [attr.x2]="h.svgX" [attr.y1]="P" [attr.y2]="H - P"
                stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="2 3" />
          <circle [attr.cx]="h.svgX" [attr.cy]="h.yPort" r="3.5"
                  fill="var(--brand)" stroke="var(--paper)" stroke-width="1.5" />
          <circle [attr.cx]="h.svgX" [attr.cy]="h.yBench" r="3"
                  fill="var(--ink-3)" stroke="var(--paper)" stroke-width="1.5" />
        }
      </svg>

      @if (hover(); as h) {
        <div class="chart-tooltip" [style.left.px]="h.hostX" [style.top.px]="h.hostY">
          <div class="chart-tooltip-label">{{ h.label }}</div>
          <div class="chart-tooltip-row">
            <span class="dot" style="background:var(--brand)"></span>
            <span>Portef.</span>
            <span style="margin-left:auto;font-weight:600">{{ h.portStr }}</span>
          </div>
          <div class="chart-tooltip-row" style="opacity:.8">
            <span class="dot" style="background:var(--ink-3)"></span>
            <span>MSCI World</span>
            <span style="margin-left:auto">{{ h.benchStr }}</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class PerfChartComponent {
  portfolio = input.required<number[]>();
  benchmark = input.required<number[]>();
  /** Optional cost-basis line ("ce que tu as mis"). Empty = not drawn. */
  invested = input<number[]>([]);

  protected readonly W = W;
  protected readonly H = H;
  protected readonly P = P;

  readonly xLabels = ['1A', '9M', '6M', '3M', '1M', 'Auj.'];

  protected readonly hover = signal<HoverState | null>(null);

  private minMax = computed(() => {
    const all = [...this.portfolio(), ...this.benchmark(), ...this.invested()];
    if (all.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...all) - 2, max: Math.max(...all) + 2 };
  });

  protected portfolioPts = computed(() => this.toPoints(this.portfolio()));
  protected benchPts     = computed(() => this.toPoints(this.benchmark()));
  protected investedPts  = computed(() => this.toPoints(this.invested()));

  private toPoints(series: number[]): string {
    if (series.length === 0) return '';
    const { min, max } = this.minMax();
    const range = max - min;
    const denom = series.length === 1 ? 1 : series.length - 1;
    return series.map((v, i) => {
      const x = P + (i / denom) * (W - P * 2);
      const y = range > 0
        ? H - P - ((v - min) / range) * (H - P * 2)
        : H - P;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  protected areaPts = computed(() => `${P},${H - P} ${this.portfolioPts()} ${W - P},${H - P}`);

  protected gridY = computed(() =>
    [0, 0.25, 0.5, 0.75, 1].map(t => H - P - t * (H - P * 2))
  );

  protected endX = computed(() => {
    const n = this.portfolio().length;
    if (n < 2) return W - P;
    return P + (W - P * 2);
  });

  protected endY = computed(() => {
    const d = this.portfolio();
    if (d.length === 0) return H - P;
    const { min, max } = this.minMax();
    const range = max - min;
    if (range <= 0) return H - P;
    return H - P - ((d[d.length - 1] - min) / range) * (H - P * 2);
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
    const ratio = W / rect.width;
    const svgX = (event.clientX - rect.left) * ratio;
    if (svgX < P || svgX > W - P) { this.hover.set(null); return; }

    const t = (svgX - P) / (W - 2 * P);
    const idx = Math.round(t * (port.length - 1));
    const clamped = Math.max(0, Math.min(port.length - 1, idx));

    const snappedSvgX = P + (clamped / (port.length - 1)) * (W - 2 * P);
    const { min, max } = this.minMax();
    const yFor = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);

    const vPort  = port[clamped];
    const vBench = bench[clamped] ?? port[clamped];

    // SVG → host pixel ratio for the HTML tooltip overlay.
    const hostX = (snappedSvgX / ratio);
    const hostY = (yFor(vPort) / ratio);

    this.hover.set({
      hostX,
      hostY,
      svgX:    snappedSvgX,
      yPort:   yFor(vPort),
      yBench:  yFor(vBench),
      label:   this.xLabelAt(clamped, port.length),
      portStr:  this.fmt(vPort),
      benchStr: this.fmt(vBench),
    });
  }

  private fmt(v: number): string {
    return v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' €';
  }

  private xLabelAt(idx: number, n: number): string {
    if (n <= 1) return 'Auj.';
    const t = idx / (n - 1);
    const i = Math.round(t * (this.xLabels.length - 1));
    return this.xLabels[i];
  }
}
