import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatNumber } from '../format';

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
  styles: `
    .delta {
      display: inline-flex; align-items: center; gap: 4px;
      font-family: var(--font-mono); font-size: 12px; font-weight: 500;
      padding: 3px 9px; border-radius: 999px;
      &.up { background: var(--gain-soft); color: var(--gain); }
      &.down { background: var(--loss-soft); color: var(--loss); }
      &.flat { background: var(--paper-2); color: var(--ink-3); }
      &::before {
        content: ""; width: 0; height: 0;
        border-left: 4px solid transparent; border-right: 4px solid transparent;
      }
      &.up::before { border-bottom: 5px solid currentColor; }
      &.down::before { border-top: 5px solid currentColor; }
      &.flat::before { display: none; }
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
    return `${sign}${formatNumber(v, this.digits())}${this.suffix()}`;
  });
}
