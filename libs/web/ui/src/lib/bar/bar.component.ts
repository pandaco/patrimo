import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-bar',
  standalone: true,
  template: `<div class="bar"><span [style.width]="pctStr()"></span></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarComponent {
  pct = input.required<number>();
  max = input(100);

  protected pctStr = computed(() =>
    Math.min(100, (this.pct() / this.max()) * 100) + '%'
  );
}
