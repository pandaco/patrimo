import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatNumber } from '../format';
import { VariationComponent } from '../variation/variation.component';

/**
 * One position as a card, for phone-width screens where the 12-column table
 * would scroll sideways. It keeps what the table's reader needs first: what the
 * position is, what it is worth, the gain since purchase and the variation over
 * the selected period — each with its own label, so the two figures are never
 * confused. The whole card is one button that asks for its detail to be toggled.
 */
@Component({
  selector: 'ui-position-card',
  standalone: true,
  imports: [VariationComponent],
  template: `
    <button type="button" class="card-button" [attr.aria-expanded]="expanded()" (click)="toggled.emit()">
      <span class="head">
        <span class="ticker">{{ ticker() }}</span>
        <span class="name">{{ name() }}</span>
        <span class="chevron" aria-hidden="true">{{ expanded() ? '▲' : '▼' }}</span>
      </span>
      <span class="value">{{ valueText() }}</span>
      <span class="metrics">
        <span class="metric">
          <span class="metric-label">PV latente</span>
          <ui-variation [amount]="pnl()" [pct]="pnlPct()" />
        </span>
        <span class="metric">
          <span class="metric-label">Var. {{ periodLabel() }}</span>
          <ui-variation [amount]="variation()" [pct]="variationPct()" />
        </span>
      </span>
    </button>
  `,
  styles: `
    :host { display: block; }
    .card-button {
      all: unset; box-sizing: border-box; width: 100%; cursor: pointer;
      display: flex; flex-direction: column; gap: 10px; padding: 14px 4px;
      &:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 8px; }
    }
    .head { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .ticker {
      font-family: var(--font-mono); font-size: 11.5px; font-weight: 500;
      padding: 3px 9px; border-radius: 999px; background: var(--ink); color: #fff;
    }
    .name { flex: 1; min-width: 0; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chevron { font-size: 10px; color: var(--ink-3); }
    .value { font-family: var(--font-mono); font-size: 22px; font-weight: 600; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .metric { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
    .metric-label { font-size: 11.5px; color: var(--ink-3); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionCardComponent {
  ticker = input.required<string>();
  name = input.required<string>();
  /** Current market value in EUR. */
  value = input.required<number>();
  /** Gain since purchase (EUR / %); `null` when unknown. */
  pnl = input<number | null>(null);
  pnlPct = input<number | null>(null);
  /** Variation over the selected period (EUR / %); `null` when not measurable. */
  variation = input<number | null>(null);
  variationPct = input<number | null>(null);
  /** Short label of the selected period, e.g. `YTD`. */
  periodLabel = input.required<string>();
  /** Whether the detail under the card is open. */
  expanded = input(false);
  /** The user asked to open or close the detail. */
  toggled = output<void>();

  protected valueText(): string {
    return `${formatNumber(this.value(), 0)} €`;
  }
}
