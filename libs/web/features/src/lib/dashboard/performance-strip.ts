import { PositionVariationDto } from '@patrimo/contracts';
import { sortRows } from '../portfolio/sort-rows';

/** What the dashboard strip ranks by: the euro gain or the percentage. */
export type StripMeasure = 'eur' | 'pct';
/** `best` = biggest gainers first, `worst` = biggest losers first. */
export type StripOrder = 'best' | 'worst';

/**
 * Orders the dashboard "Ma performance" strip. A figure that is not computable
 * (no history, or a % on a base too small to divide) has nothing to rank, so
 * that position lands last for that measure.
 */
export function sortStripPositions(
  positions: readonly PositionVariationDto[],
  measure: StripMeasure,
  order: StripOrder,
): PositionVariationDto[] {
  const accessor = (position: PositionVariationDto): number | null => {
    return measure === 'eur' ? position.variation : position.variationPct;
  };
  return sortRows(positions, accessor, order === 'best' ? 'desc' : 'asc');
}
