import { describe, expect, it } from 'vitest';
import type { Transaction, TransactionType } from '@patrimo/data-access';
import { computeTri, xirr } from './tri';

function transaction(partial: Partial<Transaction> & { id: string; type: TransactionType; date: string; amount: number }): Transaction {
  return {
    id:       partial.id,
    date:     partial.date,
    type:     partial.type,
    envelope: partial.envelope ?? 'env-1',
    etf:      partial.etf ?? null,
    qty:      partial.qty ?? 0,
    price:    partial.price ?? null,
    fees:     partial.fees ?? 0,
    taxes:    partial.taxes ?? 0,
    transferId: partial.transferId ?? null,
    amount:   partial.amount,
  };
}

describe('xirr — single deposit then liquidation', () => {
  it('returns 0 when value matches deposit (no gain, no loss)', () => {
    const r = xirr([
      { date: '2024-01-01', amount: -1000 },
      { date: '2025-01-01', amount: 1000 },
    ]);
    expect(r).not.toBeNull();
    expect(r ?? Number.NaN).toBeCloseTo(0, 3);
  });

  it('returns ~10 %/yr for a deposit that doubled in ~7.27 years (rule of 72)', () => {
    const r = xirr([
      { date: '2018-01-01', amount: -1000 },
      // 7.27 years later, 2x the value → ~10 % CAGR
      { date: '2025-04-04', amount: 2000 },
    ]);
    expect(r).not.toBeNull();
    expect(r ?? Number.NaN).toBeCloseTo(10, 0);
  });

  it('returns negative when value finished below the deposit', () => {
    const r = xirr([
      { date: '2024-01-01', amount: -1000 },
      { date: '2025-01-01', amount: 800 },
    ]);
    expect(r).not.toBeNull();
    expect(r ?? Number.NaN).toBeCloseTo(-20, 1);
  });
});

describe('xirr — multiple deposits', () => {
  it('handles staggered deposits and a single final liquidation', () => {
    // €100 at the start of each month for 12 months, then €1300 at year-end.
    // Internal rate is around 7-8 %/yr.
    const flows = [];
    for (let m = 0; m < 12; m++) {
      const date = `2024-${String(m + 1).padStart(2, '0')}-01`;
      flows.push({ date, amount: -100 });
    }
    flows.push({ date: '2024-12-31', amount: 1300 });
    const r = xirr(flows);
    expect(r).not.toBeNull();
    expect(r ?? Number.NaN).toBeGreaterThan(0);
    expect(r ?? Number.NaN).toBeLessThan(50);
  });
});

describe('xirr — degenerate inputs', () => {
  it('returns null when fewer than 2 flows', () => {
    expect(xirr([{ date: '2024-01-01', amount: -1000 }])).toBeNull();
  });

  it('returns null when all flows are on the same side (no zero crossing)', () => {
    expect(xirr([
      { date: '2024-01-01', amount: 1000 },
      { date: '2025-01-01', amount: 500 },
    ])).toBeNull();
  });

  it('returns null on invalid date strings', () => {
    expect(xirr([
      { date: 'not-a-date', amount: -1000 },
      { date: 'also-bad',   amount: 1100 },
    ])).toBeNull();
  });
});

describe('computeTri — from transaction history', () => {
  it('returns 0 for a flat deposit/value pair one year apart', () => {
    const transactions = [
      transaction({ id: 'a', type: 'DEPOSIT', date: '2025-06-07', amount: 1000 }),
    ];
    // current portfolio still worth €1000 a year later → r = 0
    const r = computeTri(transactions, 1000, new Date('2026-06-07'));
    expect(r).not.toBeNull();
    expect(r ?? Number.NaN).toBeCloseTo(0, 1);
  });

  it('ignores BUY / SELL transactions (internal transfers)', () => {
    const transactions = [
      transaction({ id: 'a', type: 'DEPOSIT', date: '2025-06-07', amount: 1000 }),
      transaction({ id: 'b', type: 'BUY',     date: '2025-06-08', amount: 900 }),
      transaction({ id: 'c', type: 'SELL',    date: '2025-12-01', amount: 950 }),
    ];
    // Whether BUY/SELL exist or not, the only thing that matters is the
    // €1000 deposit and the current value.
    const r = computeTri(transactions, 1100, new Date('2026-06-07'));
    expect(r).not.toBeNull();
    expect(r ?? Number.NaN).toBeCloseTo(10, 1);
  });

  it('returns null when there is no current value', () => {
    const transactions = [
      transaction({ id: 'a', type: 'DEPOSIT', date: '2025-06-07', amount: 1000 }),
    ];
    expect(computeTri(transactions, 0, new Date('2026-06-07'))).toBeNull();
  });

  it('returns null when there is no deposit history', () => {
    expect(computeTri([], 1000, new Date('2026-06-07'))).toBeNull();
  });
});
