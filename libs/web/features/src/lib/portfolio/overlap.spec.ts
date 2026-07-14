import { describe, expect, it } from 'vitest';
import type { Etf } from '@patrimo/data-access';
import { computeEtfOverlaps } from './overlap';

function etf(partial: Partial<Etf> & { isin: string; ticker: string }): Etf {
  return {
    isin: partial.isin,
    ticker: partial.ticker,
    name: partial.name ?? partial.ticker,
    issuer: partial.issuer ?? '',
    index: partial.index ?? '',
    ter: partial.ter ?? 0.2,
    currency: partial.currency ?? 'EUR',
    repli: partial.repli ?? '',
    distrib: partial.distrib ?? 'Capitalisant',
    pea: partial.pea ?? true,
    alloc: partial.alloc ?? 'Core',
    exposure: partial.exposure,
    qty: partial.qty ?? 1,
    pru: partial.pru ?? 0,
    price: partial.price ?? 0,
    prev: partial.prev ?? 0,
    perf1y: partial.perf1y ?? 0,
    perfYtd: partial.perfYtd ?? 0,
  };
}

describe('computeEtfOverlaps', () => {
  it('flags two held ETFs both heavily exposed to the US', () => {
    const overlaps = computeEtfOverlaps([
      etf({ isin: 'A', ticker: 'CW8', exposure: { geography: { 'États-Unis': 65, France: 5 }, sector: {}, currency: {} } }),
      etf({ isin: 'B', ticker: 'IWDA', exposure: { geography: { 'États-Unis': 60, France: 8 }, sector: {}, currency: {} } }),
    ]);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].dimension).toBe('geography');
    expect(overlaps[0].overlapPct).toBeCloseTo(65, 1);
  });

  it('ignores ETFs with no position (qty = 0)', () => {
    const overlaps = computeEtfOverlaps([
      etf({ isin: 'A', ticker: 'CW8', qty: 0, exposure: { geography: { 'États-Unis': 65 }, sector: {}, currency: {} } }),
      etf({ isin: 'B', ticker: 'IWDA', qty: 1, exposure: { geography: { 'États-Unis': 60 }, sector: {}, currency: {} } }),
    ]);

    expect(overlaps).toHaveLength(0);
  });

  it('ignores ETFs with no exposure data yet', () => {
    const overlaps = computeEtfOverlaps([
      etf({ isin: 'A', ticker: 'CW8' }),
      etf({ isin: 'B', ticker: 'IWDA', exposure: { geography: { 'États-Unis': 60 }, sector: {}, currency: {} } }),
    ]);

    expect(overlaps).toHaveLength(0);
  });

  it('stays under the threshold when exposures barely overlap', () => {
    const overlaps = computeEtfOverlaps([
      etf({ isin: 'A', ticker: 'ESE', exposure: { geography: { France: 90 }, sector: {}, currency: {} } }),
      etf({ isin: 'B', ticker: 'AGGH', exposure: { geography: { 'États-Unis': 90 }, sector: {}, currency: {} } }),
    ]);

    expect(overlaps).toHaveLength(0);
  });

  it('sorts by descending overlap and reports both tickers', () => {
    const overlaps = computeEtfOverlaps([
      etf({ isin: 'A', ticker: 'CW8', exposure: { geography: { 'États-Unis': 90 }, sector: { Techno: 20 }, currency: {} } }),
      etf({ isin: 'B', ticker: 'IWDA', exposure: { geography: { 'États-Unis': 85 }, sector: { Techno: 15 }, currency: {} } }),
      etf({ isin: 'C', ticker: 'PANX', exposure: { geography: { 'États-Unis': 55 }, sector: {}, currency: {} } }),
    ]);

    expect(overlaps[0].overlapPct).toBeGreaterThanOrEqual(overlaps[overlaps.length - 1].overlapPct);
    expect(overlaps.some(o => o.tickerA === 'CW8' && o.tickerB === 'IWDA')).toBe(true);
  });
});
