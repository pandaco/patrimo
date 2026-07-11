import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface DonutSlice {
  value: number;
  color: string;
  label?: string;
  unit?: string;
}

interface ComputedSlice {
  stroke: string;
  dasharray: string;
  dashoffset: number;
  label: string;
  valueText: string;
  pctText: string;
}

interface HoverState {
  index: number;
  x: number;
  y: number;
  label: string;
  valueText: string;
  pctText: string;
  color: string;
}

@Component({
  selector: 'ui-donut',
  standalone: true,
  template: `
    <div class="chart-host" (mouseleave)="hover.set(null)">
      <svg [attr.width]="size()" [attr.height]="size()" [attr.viewBox]="vb()">
        <circle
          [attr.cx]="cx()" [attr.cy]="cx()" [attr.r]="r()"
          fill="none" stroke="var(--paper-2)" [attr.stroke-width]="thickness()"
        />
        @for (s of slices(); track $index; let i = $index) {
          <circle
            [attr.cx]="cx()" [attr.cy]="cx()" [attr.r]="r()"
            fill="none"
            [attr.stroke]="s.stroke"
            [attr.stroke-width]="thickness()"
            [attr.stroke-dasharray]="s.dasharray"
            [attr.stroke-dashoffset]="s.dashoffset"
            [attr.transform]="'rotate(-90 ' + cx() + ' ' + cx() + ')'"
            style="cursor: help; pointer-events: visibleStroke"
            (mousemove)="onSliceMove($event, i, s)"
            (mouseenter)="onSliceMove($event, i, s)"
          />
        }
      </svg>
      @if (hover(); as h) {
        <div class="chart-tooltip" [style.left.px]="h.x" [style.top.px]="h.y">
          <div class="chart-tooltip-label">{{ h.label }}</div>
          <div class="chart-tooltip-row">
            <span class="dot" [style.background]="h.color"></span>
            <span>{{ h.valueText }}</span>
            <span style="opacity:.7">·</span>
            <span>{{ h.pctText }}</span>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutComponent {
  data      = input.required<DonutSlice[]>();
  size      = input(160);
  thickness = input(22);

  protected readonly hover = signal<HoverState | null>(null);

  protected cx = computed(() => this.size() / 2);
  protected r  = computed(() => this.size() / 2 - this.thickness() / 2);
  protected vb = computed(() => `0 0 ${this.size()} ${this.size()}`);

  protected slices = computed<ComputedSlice[]>(() => {
    const d = this.data();
    const total = d.reduce((a, s) => a + s.value, 0);
    if (!total) return [];
    const C = 2 * Math.PI * this.r();
    let offset = 0;
    return d.map(s => {
      const len = (s.value / total) * C;
      const pct = (s.value / total) * 100;
      const slice: ComputedSlice = {
        stroke:    s.color,
        dasharray: `${len} ${C - len}`,
        dashoffset: -offset,
        label:      s.label ?? '',
        valueText:  this.formatValue(s),
        pctText:    `${pct.toFixed(1)}%`,
      };
      offset += len;
      return slice;
    });
  });

  private formatValue(s: DonutSlice): string {
    const value = s.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    return s.unit ? `${value} ${s.unit}` : value;
  }

  protected onSliceMove(event: MouseEvent, index: number, slice: ComputedSlice): void {
    if (!slice.label) return;
    const host = (event.currentTarget as SVGElement).ownerSVGElement?.parentElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    // Tooltip is centered on x via CSS transform: translateX(-50%); clamp it
    // so it doesn't overflow the host's left/right edge near a small donut.
    const TOOLTIP_HALF_WIDTH = 85;
    const x = Math.max(TOOLTIP_HALF_WIDTH, Math.min(rect.width - TOOLTIP_HALF_WIDTH, event.clientX - rect.left));
    this.hover.set({
      index,
      x,
      y: event.clientY - rect.top,
      label:     slice.label,
      valueText: slice.valueText,
      pctText:   slice.pctText,
      color:     slice.stroke,
    });
  }
}
