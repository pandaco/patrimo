import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatNumber } from '../format';
import { DeltaComponent } from '../delta/delta.component';

/**
 * A period variation as two stacked cues: the signed euro amount (coloured) and
 * the percentage badge with its up/down arrow. The sign, the arrow and the colour
 * all say the same thing, so the table stays readable without relying on colour.
 * `null` means "not computable" and renders a dash — never a misleading 0. When
 * the caller knows why (`unavailable`, e.g. a value the user declared by hand, with
 * no history to measure), that reason is shown in words instead of two dashes.
 */
@Component({
  selector: 'ui-variation',
  standalone: true,
  imports: [DeltaComponent],
  template: `
    @if (amount() === null && unavailable()) {
      <span class="unavailable" [attr.title]="unavailableHint()">{{ unavailable() }}</span>
    } @else {
      <div class="amount" [class.up]="direction() === 'up'" [class.down]="direction() === 'down'">{{ amountText() }}</div>
      <ui-delta [value]="pct()" />
    }
  `,
  styles: `
    :host { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 3px; }
    .amount { font-family: var(--font-mono); font-size: 13px; color: var(--ink-3); }
    .amount.up { color: var(--gain); }
    .amount.down { color: var(--loss); }
    .unavailable { font-size: 11.5px; color: var(--ink-3); font-style: italic; cursor: help; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariationComponent {
  /** Euro variation over the period; `null` when unknown. */
  amount = input<number | null>(null);
  /** Percentage variation over the period; `null` when it cannot be computed. */
  pct = input<number | null>(null);
  /** Shown instead of the dashes when `amount` is `null` and the reason is known. */
  unavailable = input<string | null>(null);
  /** Longer explanation of `unavailable`, exposed as a native tooltip. */
  unavailableHint = input<string | null>(null);

  protected direction = computed<'up' | 'down' | 'flat'>(() => {
    const value = this.amount() ?? 0;
    return value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  });

  protected amountText = computed(() => {
    const value = this.amount();
    if (value === null) return '—';
    return `${value > 0 ? '+' : ''}${formatNumber(value, 0)} €`;
  });
}
