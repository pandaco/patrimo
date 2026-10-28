import { VariationRowDto } from '@patrimo/contracts';
import { SortState, sortRows } from '../portfolio/sort-rows';

/**
 * Sorts the enveloppe rows of the period-variation table, with the same rules as
 * the positions table. An enveloppe whose period is not computable (no % — no
 * history yet) has no variation to rank, so it always lands last.
 */
export function sortEnvelopeRows(rows: readonly VariationRowDto[], sort: SortState): VariationRowDto[] {
  const accessor = (row: VariationRowDto): number | null => {
    switch (sort.key) {
      case 'value':
      case 'weight':    return row.value;
      case 'pnl':       return row.pnl;
      case 'variation': return row.variationPct === null ? null : row.variation;
    }
  };
  return sortRows(rows, accessor, sort.direction);
}
