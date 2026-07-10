import type { Etf } from '@patrimo/data-access';

export type OverlapDimension = 'geo' | 'sector';

export interface EtfOverlap {
  isinA: string;
  tickerA: string;
  isinB: string;
  tickerB: string;
  dimension: OverlapDimension;
  /** Sum of min(a[key], b[key]) across every shared key, in % (0-100). */
  overlapPct: number;
}

const DIMENSIONS: OverlapDimension[] = ['geo', 'sector'];

/**
 * Flags pairs of *held* ETFs that share heavy exposure on the same
 * geography or sector — two different tickers can still be the same bet.
 * Overlap is the classic "sum of the minimum weight per shared key" metric:
 * two funds both 60% exposed to the US contribute at least 60 to the score.
 */
export function computeEtfOverlaps(etfs: Etf[], threshold = 50): EtfOverlap[] {
  const held = etfs.filter(e => e.qty > 0 && e.exposure);
  const results: EtfOverlap[] = [];

  for (let i = 0; i < held.length; i++) {
    for (let j = i + 1; j < held.length; j++) {
      const a = held[i];
      const b = held[j];
      const exposureA = a.exposure as NonNullable<Etf['exposure']>;
      const exposureB = b.exposure as NonNullable<Etf['exposure']>;
      for (const dimension of DIMENSIONS) {
        const expA = exposureA[dimension];
        const expB = exposureB[dimension];
        const keys = new Set([...Object.keys(expA), ...Object.keys(expB)]);
        let overlapPct = 0;
        for (const key of keys) {
          overlapPct += Math.min(expA[key] ?? 0, expB[key] ?? 0);
        }
        if (overlapPct >= threshold) {
          results.push({
            isinA: a.isin, tickerA: a.ticker,
            isinB: b.isin, tickerB: b.ticker,
            dimension,
            overlapPct: Math.round(overlapPct * 10) / 10,
          });
        }
      }
    }
  }

  return results.sort((x, y) => y.overlapPct - x.overlapPct);
}
