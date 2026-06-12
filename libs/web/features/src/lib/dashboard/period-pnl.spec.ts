import { describe, expect, it } from 'vitest';
import { computePeriodPnl } from './period-pnl';

const LABELS = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];

describe('computePeriodPnl', () => {
  it('returns null when the series is empty or all zeros', () => {
    expect(computePeriodPnl([], [], [])).toBeNull();
    expect(computePeriodPnl(LABELS, [0, 0, 0, 0, 0], [])).toBeNull();
  });

  it('returns null when labels and portfolio lengths diverge', () => {
    expect(computePeriodPnl(LABELS, [100, 110], [])).toBeNull();
  });

  it('computes a pure market gain without transactions', () => {
    const result = computePeriodPnl(LABELS, [1000, 1010, 1020, 1040, 1100], []);
    expect(result).toEqual({ eur: 100, pct: 10 });
  });

  it('subtracts a mid-window BUY so a deposit is not counted as gain', () => {
    // Value jumps from 1000 to 1500 only because of a 500 € buy on day 3.
    const result = computePeriodPnl(LABELS, [1000, 1000, 1500, 1500, 1500], [
      { date: '2026-06-03', type: 'BUY', amount: 500 },
    ]);
    expect(result?.eur).toBe(0);
    expect(result?.pct).toBe(0);
  });

  it('adds back a mid-window SELL so a withdrawal is not counted as loss', () => {
    // Value drops from 1000 to 700 because 300 € were sold, not lost.
    const result = computePeriodPnl(LABELS, [1000, 1000, 700, 700, 700], [
      { date: '2026-06-03', type: 'SELL', amount: 300 },
    ]);
    expect(result?.eur).toBe(0);
  });

  it('ignores transactions dated on the start label (already in the start sample)', () => {
    const result = computePeriodPnl(LABELS, [1000, 1000, 1000, 1000, 1050], [
      { date: '2026-06-01', type: 'BUY', amount: 400 },
    ]);
    expect(result?.eur).toBe(50);
  });

  it('ignores cash-only transactions (DEPOSIT, DIVIDEND, INTEREST)', () => {
    const result = computePeriodPnl(LABELS, [1000, 1000, 1000, 1000, 1050], [
      { date: '2026-06-03', type: 'DEPOSIT', amount: 500 },
      { date: '2026-06-03', type: 'DIVIDEND', amount: 20 },
      { date: '2026-06-04', type: 'INTEREST', amount: 5 },
    ]);
    expect(result?.eur).toBe(50);
  });

  it('uses capital engaged (start + net buys) as the percentage base', () => {
    // Start 1000, buy 1000 mid-window, end 2100 → gain 100 on 2000 engaged = 5 %.
    const result = computePeriodPnl(LABELS, [1000, 1000, 2000, 2050, 2100], [
      { date: '2026-06-03', type: 'BUY', amount: 1000 },
    ]);
    expect(result?.eur).toBe(100);
    expect(result?.pct).toBe(5);
  });

  it('skips leading zeros before the first position (cold start)', () => {
    // Portfolio born on day 3 via a 500 € buy; only the move after counts.
    const result = computePeriodPnl(LABELS, [0, 0, 500, 510, 520], [
      { date: '2026-06-03', type: 'BUY', amount: 500 },
    ]);
    expect(result?.eur).toBe(20);
    expect(result?.pct).toBe(4);
  });
});
