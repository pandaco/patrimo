import { PositionVariationDto } from '@patrimo/contracts';
import { sortRows } from '../portfolio/sort-rows';

/** What the dashboard strip ranks by: the euro gain or the percentage. */
export type StripMeasure = 'eur' | 'pct';
/** `best` = biggest gainers first, `worst` = biggest losers first. */
export type StripOrder = 'best' | 'worst';

/**
 * Orders the dashboard "Ma performance" strip. A position whose period is not
 * computable (no % yet) has nothing to rank, so it always lands last.
 */
export function sortStripPositions(
  positions: readonly PositionVariationDto[],
  measure: StripMeasure,
  order: StripOrder,
): PositionVariationDto[] {
  const accessor = (position: PositionVariationDto): number | null => {
    if (position.variationPct === null) return null;
    return measure === 'eur' ? position.variation : position.variationPct;
  };
  return sortRows(positions, accessor, order === 'best' ? 'desc' : 'asc');
}
