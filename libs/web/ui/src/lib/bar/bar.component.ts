import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-bar',
  standalone: true,
  template: `<div class="bar"><span [style.width]="pctStr()"></span></div>`,
  styles: `
    .bar {
      height: 6px; background: var(--paper-2); border-radius: 999px; overflow: hidden; position: relative;
      > span { display: block; height: 100%; background: var(--ink); border-radius: 999px; }
      &.olive > span, &.brand > span { background: var(--brand); }
      &.thin { height: 3px; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarComponent {
  pct = input.required<number>();
  max = input(100);

  protected pctStr = computed(() =>
    Math.min(100, (this.pct() / this.max()) * 100) + '%'
  );
}
