import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface DonutSlice { value: number; color: string }

interface ComputedSlice { stroke: string; dasharray: string; dashoffset: number }

@Component({
  selector: 'ui-donut',
  standalone: true,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" [attr.viewBox]="vb()">
      <circle
        [attr.cx]="cx()" [attr.cy]="cx()" [attr.r]="r()"
        fill="none" stroke="var(--paper-2)" [attr.stroke-width]="thickness()"
      />
      @for (s of slices(); track $index) {
        <circle
          [attr.cx]="cx()" [attr.cy]="cx()" [attr.r]="r()"
          fill="none"
          [attr.stroke]="s.stroke"
          [attr.stroke-width]="thickness()"
          [attr.stroke-dasharray]="s.dasharray"
          [attr.stroke-dashoffset]="s.dashoffset"
          [attr.transform]="'rotate(-90 ' + cx() + ' ' + cx() + ')'"
        />
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutComponent {
  data      = input.required<DonutSlice[]>();
  size      = input(160);
  thickness = input(22);

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
      const slice: ComputedSlice = {
        stroke: s.color,
        dasharray: `${len} ${C - len}`,
        dashoffset: -offset,
      };
      offset += len;
      return slice;
    });
  });
}
