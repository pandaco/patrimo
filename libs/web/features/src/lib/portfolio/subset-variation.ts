import type { VariationDto } from '@patrimo/contracts';

export interface SubsetVariation {
  variation: number | null;
  variationPct: number | null;
}

// Same floor as the service: under 1 € of capital a ratio is only rounding noise.
const MIN_CAPITAL = 1;

/**
 * Period variation of any subset of positions (an allocation filter, one
 * envelope…). A percentage cannot be added up, but its base can: the combined
 * percentage is Σ gain ÷ Σ capital base, exact and consistent with the total of
 * the whole table. Lines with nothing measurable (a declared value) are left out.
 */
export function subsetVariation(rows: readonly Pick<VariationDto, 'variation' | 'capitalBase'>[]): SubsetVariation {
  const measurable = rows.filter(row => row.variation !== null);
  if (measurable.length === 0) return { variation: null, variationPct: null };

  const gain = measurable.reduce((sum, row) => sum + (row.variation ?? 0), 0);
  const base = measurable.reduce((sum, row) => sum + (row.capitalBase ?? 0), 0);
  return {
    variation: Number(gain.toFixed(2)),
    variationPct: base >= MIN_CAPITAL ? Number(((gain / base) * 100).toFixed(2)) : null,
  };
}
