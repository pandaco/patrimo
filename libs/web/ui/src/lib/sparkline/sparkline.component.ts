import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Point { x: string; y: string }

@Component({
  selector: 'ui-sparkline',
  standalone: true,
  template: `
    @if (points().length) {
      <svg class="spark" [attr.viewBox]="vb()" preserveAspectRatio="none">
        @if (fill()) {
          <polygon [attr.points]="fillPts()" [attr.fill]="stroke()" opacity="0.08" />
        }
        <polyline
          [attr.points]="linePts()"
          fill="none"
          [attr.stroke]="lineColor()"
          stroke-width="1.4"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>
    }
  `,
  styles: `
    .spark { width: 80px; height: 24px; vertical-align: middle; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparklineComponent {
  data   = input<number[]>([]);
  color  = input('currentColor');
  width  = input(80);
  height = input(24);
  fill   = input(false);

  protected vb = computed(() => `0 0 ${this.width()} ${this.height()}`);

  protected points = computed<Point[]>(() => {
    const d = this.data();
    if (!d.length) return [];
    const w = this.width(), h = this.height();
    let min = d[0], max = d[0];
    for (const v of d) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;
    const denom = d.length === 1 ? 1 : d.length - 1;
    return d.map((v, i) => ({
      x: ((i / denom) * (w - 2) + 1).toFixed(2),
      y: (h - 1 - ((v - min) / range) * (h - 2)).toFixed(2),
    }));
  });

  protected stroke = computed(() => {
    const d = this.data();
    return d.length && d[d.length - 1] >= d[0] ? 'var(--gain)' : 'var(--loss)';
  });

  protected lineColor = computed(() =>
    this.color() === 'currentColor' ? this.stroke() : this.color()
  );

  protected linePts = computed(() =>
    this.points().map(p => `${p.x},${p.y}`).join(' ')
  );

  protected fillPts = computed(() => {
    const pts = this.points();
    const h = this.height(), w = this.width();
    return `1,${h} ${pts.map(p => `${p.x},${p.y}`).join(' ')} ${w - 1},${h}`;
  });
}
