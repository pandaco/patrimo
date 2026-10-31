export interface ReturnFigures {
  twrPct: number | null;
  investedReturnPct: number | null;
}

export interface HeadlineReturn {
  pct: number;
  /** `invested` = gain ÷ money at work (matches the tables); `twr` = time-weighted fallback. */
  basis: 'invested' | 'twr';
}

/**
 * The percentage shown beside the euro gain. It is the gain on the money at work,
 * the same figure the Portefeuille and Patrimoine tables show next to their euro
 * variation, so no two screens disagree on one gain. The time-weighted return is
 * only a fallback when that base is too small to divide by.
 */
export function headlineReturn(figures: ReturnFigures | null): HeadlineReturn | null {
  if (!figures) return null;
  if (figures.investedReturnPct !== null) return { pct: figures.investedReturnPct, basis: 'invested' };
  if (figures.twrPct !== null) return { pct: figures.twrPct, basis: 'twr' };
  return null;
}
