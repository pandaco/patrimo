import { describe, expect, it } from 'vitest';
import type { Transaction, TransactionType } from '@patrimo/data-access';
import { computeRealized, startOfYearISO } from './realized-pnl';

function tx(partial: Partial<Transaction> & { id: string; type: TransactionType; date: string }): Transaction {
  return {
    id:       partial.id,
    date:     partial.date,
    type:     partial.type,
    envelope: partial.envelope ?? 'env-1',
    etf:      partial.etf ?? 'ISIN1',
    qty:      partial.qty ?? 1,
    price:    partial.price ?? 100,
    fees:     partial.fees ?? 0,
    taxes:    partial.taxes ?? 0,
    transferId: partial.transferId ?? null,
    amount:   partial.amount ?? 100,
  };
}

const Y = '2026-01-01';

describe('computeRealized — FIFO matching', () => {
  it('returns 0 when there are no transactions', () => {
    expect(computeRealized([], Y).realizedSince).toBe(0);
  });

  it('matches one full SELL against a prior BUY', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2025-06-01', qty: 10, amount: 1000 }),
      tx({ id: 'b', type: 'SELL', date: '2026-02-01', qty: 10, amount: 1200 }),
    ];
    expect(computeRealized(txs, Y).realizedSince).toBeCloseTo(200);
  });

  it('drops the realized leg of a SELL dated before the window', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-06-01', qty: 10, amount: 1000 }),
      tx({ id: 'b', type: 'SELL', date: '2025-08-01', qty: 10, amount: 1300 }),
    ];
    // SELL in 2025 should not count for the 2026 YTD window.
    expect(computeRealized(txs, Y).realizedSince).toBe(0);
  });

  it('honours FIFO ordering when lots have different cost bases', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-01-01', qty: 5, amount: 500 }),  // 100 / unit
      tx({ id: 'b', type: 'BUY',  date: '2025-01-01', qty: 5, amount: 750 }),  // 150 / unit
      tx({ id: 'c', type: 'SELL', date: '2026-03-01', qty: 7, amount: 1400 }), // 200 / unit
    ];
    // 5 units from the 100-cost lot + 2 units from the 150-cost lot, sold at 200.
    // realized = 5*(200-100) + 2*(200-150) = 500 + 100 = 600
    expect(computeRealized(txs, Y).realizedSince).toBeCloseTo(600);
  });
});

describe('computeRealized — guards', () => {
  it('skips a BUY with qty=0 instead of poisoning the figure with NaN', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-06-01', qty: 0,  amount: 0 }),
      tx({ id: 'b', type: 'BUY',  date: '2024-07-01', qty: 10, amount: 1000 }),
      tx({ id: 'c', type: 'SELL', date: '2026-02-01', qty: 10, amount: 1500 }),
    ];
    const report = computeRealized(txs, Y);
    expect(Number.isFinite(report.realizedSince)).toBe(true);
    expect(report.realizedSince).toBeCloseTo(500);
  });

  it('skips a SELL with qty=0', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-06-01', qty: 10, amount: 1000 }),
      tx({ id: 'b', type: 'SELL', date: '2026-02-01', qty: 0,  amount: 0 }),
    ];
    expect(computeRealized(txs, Y).realizedSince).toBe(0);
  });

  it('ignores transactions with no ETF', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-06-01', etf: null as unknown as string, qty: 10, amount: 1000 }),
    ];
    expect(computeRealized(txs, Y).realizedSince).toBe(0);
  });
});

describe('computeRealized — same-date BUY/SELL', () => {
  it('matches a BUY+SELL pair on the same date regardless of input order', () => {
    // Mimic the DB order: ORDER BY date DESC, so SELL comes first in input.
    const txs = [
      tx({ id: 'sell', type: 'SELL', date: '2026-03-15', qty: 5, amount: 600 }),
      tx({ id: 'buy',  type: 'BUY',  date: '2026-03-15', qty: 5, amount: 500 }),
    ];
    expect(computeRealized(txs, Y).realizedSince).toBeCloseTo(100);
  });
});

describe('computeRealized — fees are part of the cost basis', () => {
  it('raises the cost basis by buy fees and lowers proceeds by sell fees', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-06-01', qty: 10, amount: 1000, fees: 5 }), // basis = 1005
      tx({ id: 'b', type: 'SELL', date: '2026-02-01', qty: 10, amount: 1200, fees: 5 }), // proceeds = 1195
    ];
    expect(computeRealized(txs, Y).realizedSince).toBeCloseTo(190);
  });
});

describe('computeRealized — orphan sells', () => {
  it('reports SELLs that had no prior BUY to match against', () => {
    const txs = [
      tx({ id: 'a', type: 'SELL', date: '2026-02-01', qty: 5, amount: 600 }),
    ];
    const report = computeRealized(txs, Y);
    expect(report.realizedSince).toBe(0);
    expect(report.orphanSellCount).toBe(1);
    expect(report.orphanSellUnits).toBe(5);
  });

  it('counts the orphan units of a partially-matched SELL', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-06-01', qty: 3,  amount: 300 }),
      tx({ id: 'b', type: 'SELL', date: '2026-02-01', qty: 10, amount: 1200 }),
    ];
    const report = computeRealized(txs, Y);
    expect(report.orphanSellCount).toBe(1);
    expect(report.orphanSellUnits).toBe(7);
  });
});

describe('computeRealized — closed positions', () => {
  it('lists fully exited positions with fee-aware realized PnL', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-01-01', qty: 10, amount: 1000, fees: 5 }), // 1005 basis
      tx({ id: 'b', type: 'SELL', date: '2025-12-15', qty: 10, amount: 1300, fees: 5 }), // 1295 proceeds
    ];
    const report = computeRealized(txs, Y);
    expect(report.closedPositions).toHaveLength(1);
    expect(report.closedPositions[0].realizedPnl).toBeCloseTo(290);
    expect(report.closedPositions[0].lastSell).toBe('2025-12-15');
  });

  it('does NOT list a position that still has open units', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-01-01', qty: 10, amount: 1000 }),
      tx({ id: 'b', type: 'SELL', date: '2025-12-15', qty: 5,  amount: 600 }), // half sold
    ];
    expect(computeRealized(txs, Y).closedPositions).toHaveLength(0);
  });

  it('sorts closed positions by most-recent last sell first', () => {
    const txs = [
      tx({ id: 'a1', type: 'BUY',  date: '2023-01-01', etf: 'ISIN_A', qty: 1, amount: 100 }),
      tx({ id: 'a2', type: 'SELL', date: '2024-05-01', etf: 'ISIN_A', qty: 1, amount: 120 }),
      tx({ id: 'b1', type: 'BUY',  date: '2023-01-01', etf: 'ISIN_B', qty: 1, amount: 100 }),
      tx({ id: 'b2', type: 'SELL', date: '2025-08-01', etf: 'ISIN_B', qty: 1, amount: 130 }),
    ];
    const closed = computeRealized(txs, Y).closedPositions;
    expect(closed.map(c => c.isin)).toEqual(['ISIN_B', 'ISIN_A']);
  });
});

describe('startOfYearISO', () => {
  it('returns YYYY-01-01 for an arbitrary date', () => {
    expect(startOfYearISO(new Date('2026-06-15T12:00:00Z'))).toBe('2026-01-01');
  });
});

describe('computeRealized — taxes are part of the cost basis', () => {
  it('raises the basis by buy taxes and lowers proceeds by sell taxes', () => {
    const txs = [
      tx({ id: 'a', type: 'BUY',  date: '2024-06-01', qty: 10, amount: 1000, fees: 5, taxes: 3 }), // basis = 1008
      tx({ id: 'b', type: 'SELL', date: '2026-02-01', qty: 10, amount: 1200, fees: 5, taxes: 2 }), // proceeds = 1193
    ];
    const report = computeRealized(txs, '2026-01-01');
    expect(report.realizedSince).toBeCloseTo(1193 - 1008, 6);
  });
});
