import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { fmtNum } from '../format';

@Component({
  selector: 'ui-delta',
  standalone: true,
  template: `
    @if (value() === 0 || value() === null || value() === undefined) {
      <span class="delta flat">—</span>
    } @else {
      <span [class]="cls()">{{ text() }}</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeltaComponent {
  value = input<number | null | undefined>(undefined);
  suffix = input('%');
  digits = input(2);

  protected cls = computed(() => 'delta ' + ((this.value() ?? 0) > 0 ? 'up' : 'down'));
  protected text = computed(() => {
    const v = this.value() ?? 0;
    const sign = v > 0 ? '+' : '';
    return `${sign}${fmtNum(v, this.digits())}${this.suffix()}`;
  });
}
