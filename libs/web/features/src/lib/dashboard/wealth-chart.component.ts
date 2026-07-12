import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const W = 700, H = 200, P = 8;

interface HoverState {
  hostX: number;
  hostY: number;
  svgX: number;
  svgY: number;
  label: string;
  valueStr: string;
}

/** Axis tick label — precision adapts to the range so ticks never collide
 *  into identical labels (a 2,6–3,1 k€ window used to print "3 k€" thrice). */
function fmtTick(v: number, range: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.', ',') + ' M€';
  if (abs >= 1_000) {
    const decimals = range < 5_000 ? 1 : 0;
    return (v / 1_000).toFixed(decimals).replace('.', ',') + ' k€';
  }
  return Math.round(v) + ' €';
}

@Component({
  selector: 'app-wealth-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-host" style="display:block;width:100%;position:relative">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + (H + 24)"
           style="width:100%;height:auto;display:block"
           (mousemove)="onMove($event)"
           (mouseleave)="hover.set(null)">

        @for (g of gridLines(); track $index) {
          <line [attr.x1]="P" [attr.x2]="W - P" [attr.y1]="g.y" [attr.y2]="g.y"
                stroke="var(--rule-soft)" [attr.stroke-dasharray]="$index === 0 ? 'none' : '2 4'" />
          <text [attr.x]="W - P - 2" [attr.y]="g.y - 3"
                font-size="9" fill="var(--ink-4)" text-anchor="end">{{ g.label }}</text>
        }

        <defs>
          <linearGradient [id]="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.18" />
            <stop offset="100%" stop-color="var(--brand)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <polygon [attr.points]="areaPts()" [attr.fill]="'url(#' + gradientId + ')'" />
        <polyline [attr.points]="linePts()" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linejoin="round" />

        @if (endX() > P && data().length > 1) {
          <circle [attr.cx]="endX()" [attr.cy]="endY()" r="4"
                  fill="var(--brand)" stroke="var(--paper)" stroke-width="2" />
        }

        @for (xl of xLabels(); track $index) {
          <text [attr.x]="xl.x" [attr.y]="H + 16"
                font-size="10" fill="var(--ink-3)" text-anchor="middle">{{ xl.label }}</text>
        }

        @if (hover(); as h) {
          <line [attr.x1]="h.svgX" [attr.x2]="h.svgX" [attr.y1]="P" [attr.y2]="H - P"
                stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="2 3" />
          <circle [attr.cx]="h.svgX" [attr.cy]="h.svgY" r="3.5"
                  fill="var(--brand)" stroke="var(--paper)" stroke-width="1.5" />
        }
      </svg>

      @if (hover(); as h) {
        <div class="chart-tooltip" [style.left.px]="h.hostX" [style.top.px]="h.hostY">
          <div class="chart-tooltip-label">{{ h.label }}</div>
          <div class="chart-tooltip-row">
            <span class="dot" style="background:var(--brand)"></span>
            <span style="margin-left:auto;font-weight:600">{{ h.valueStr }}</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class WealthChartComponent {
  data   = input.required<number[]>();
  labels = input<string[]>([]);

  readonly gradientId = 'wealth-grad-' + Math.random().toString(36).slice(2, 7);
  protected readonly hover = signal<HoverState | null>(null);

  protected readonly W = W;
  protected readonly H = H;
  protected readonly P = P;

  private readonly minMax = computed(() => {
    const d = this.data();
    if (d.length === 0) return { min: 0, max: 1 };
    // Zeros and negative values are real samples (days before the first
    // transaction, unfunded buys) — they MUST be part of the domain,
    // otherwise `toY` maps them below the axis line, outside the plot.
    const min = Math.min(...d);
    const max = Math.max(...d);
    const pad = (max - min) * 0.05 || Math.abs(max) * 0.01 || 1;
    return { min: min - pad, max: max + pad };
  });

  private toY(v: number): number {
    const { min, max } = this.minMax();
    const range = max - min;
    return range > 0 ? H - P - ((v - min) / range) * (H - P * 2) : H - P;
  }

  protected readonly linePts = computed(() => {
    const d = this.data();
    if (d.length === 0) return '';
    const denom = d.length === 1 ? 1 : d.length - 1;
    return d.map((v, i) => `${(P + (i / denom) * (W - P * 2)).toFixed(1)},${this.toY(v).toFixed(1)}`).join(' ');
  });

  protected readonly areaPts = computed(() => {
    const d = this.data();
    if (d.length === 0) return '';
    const denom = d.length === 1 ? 1 : d.length - 1;
    const pts = d.map((v, i) => `${(P + (i / denom) * (W - P * 2)).toFixed(1)},${this.toY(v).toFixed(1)}`).join(' ');
    return `${P},${H - P} ${pts} ${W - P},${H - P}`;
  });

  protected readonly endX = computed(() => {
    const n = this.data().length;
    if (n < 1) return P;
    return P + (W - P * 2);
  });

  protected readonly endY = computed(() => {
    const d = this.data();
    if (d.length === 0) return H - P;
    return this.toY(d[d.length - 1]);
  });

  protected readonly gridLines = computed(() => {
    const { min, max } = this.minMax();
    return [0, 0.25, 0.5, 0.75, 1].map(t => ({
      y: H - P - t * (H - P * 2),
      label: fmtTick(min + t * (max - min), max - min),
    }));
  });

  protected readonly xLabels = computed(() => {
    const lbls = this.labels();
    if (lbls.length === 0) return [];
    const count = Math.min(6, lbls.length);
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i / (count - 1)) * (lbls.length - 1));
      const iso = lbls[idx];
      const d   = new Date(iso + 'T00:00:00');
      const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        .replace(' ', ' ');
      const x = P + (idx / (lbls.length - 1)) * (W - P * 2);
      return { x, label };
    });
  });

  protected onMove(event: MouseEvent): void {
    const d = this.data();
    if (d.length < 2) { this.hover.set(null); return; }

    const svgEl = event.currentTarget as SVGSVGElement | null;
    if (!svgEl) return;
    const rect  = svgEl.getBoundingClientRect();
    const ratio = W / rect.width;
    const svgX  = (event.clientX - rect.left) * ratio;
    if (svgX < P || svgX > W - P) { this.hover.set(null); return; }

    const t       = (svgX - P) / (W - 2 * P);
    const idx     = Math.max(0, Math.min(d.length - 1, Math.round(t * (d.length - 1))));
    const snapped = P + (idx / (d.length - 1)) * (W - 2 * P);
    const svgY    = this.toY(d[idx]);
    const lbls    = this.labels();
    const iso     = lbls[idx] ?? '';
    const label   = iso
      ? new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    // Tooltip is centered on hostX via CSS transform: translateX(-50%); clamp
    // it so it doesn't overflow the chart's left/right edge near the ends.
    const TOOLTIP_HALF_WIDTH = 85;
    const hostX = Math.max(TOOLTIP_HALF_WIDTH, Math.min(rect.width - TOOLTIP_HALF_WIDTH, snapped / ratio));

    this.hover.set({
      hostX,
      hostY:    svgY    / ratio,
      svgX:     snapped,
      svgY,
      label,
      valueStr: d[idx].toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €',
    });
  }
}
