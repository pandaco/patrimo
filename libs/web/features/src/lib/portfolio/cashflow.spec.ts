import { describe, expect, it } from 'vitest';
import type { Transaction, TransactionType } from '@patrimo/data-access';
import { computeMonthlyCashflow } from './cashflow';

function tx(partial: Partial<Transaction> & { id: string; type: TransactionType; date: string; amount: number }): Transaction {
  return {
    id: partial.id,
    date: partial.date,
    type: partial.type,
    envelope: partial.envelope ?? 'env-1',
    etf: partial.etf ?? null,
    qty: partial.qty ?? 0,
    price: partial.price ?? null,
    fees: partial.fees ?? 0,
    taxes: partial.taxes ?? 0,
    transferId: partial.transferId ?? null,
    amount: partial.amount,
  };
}

describe('computeMonthlyCashflow', () => {
  const now = new Date('2026-03-15');

  it('returns `months` buckets even with no transactions, oldest first', () => {
    const rows = computeMonthlyCashflow([], 3, now);
    expect(rows.map(r => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(rows.every(r => r.in === 0 && r.out === 0 && r.revenus === 0 && r.net === 0)).toBe(true);
  });

  it('sums DEPOSIT as in and WITHDRAWAL as out for the right month', () => {
    const rows = computeMonthlyCashflow([
      tx({ id: '1', type: 'DEPOSIT',    date: '2026-02-05', amount: 1000 }),
      tx({ id: '2', type: 'DEPOSIT',    date: '2026-02-20', amount: 500 }),
      tx({ id: '3', type: 'WITHDRAWAL', date: '2026-02-10', amount: 200 }),
    ], 3, now);

    const feb = rows.find(r => r.month === '2026-02');
    expect(feb?.in).toBe(1500);
    expect(feb?.out).toBe(200);
    expect(feb?.net).toBe(1300);
  });

  it('keeps dividends/interest as a separate `revenus` series, not in/out', () => {
    const rows = computeMonthlyCashflow([
      tx({ id: '1', type: 'DIVIDEND', date: '2026-03-01', amount: 40 }),
      tx({ id: '2', type: 'INTEREST', date: '2026-03-02', amount: 10 }),
      tx({ id: '3', type: 'BUY',      date: '2026-03-03', amount: 300 }),
    ], 1, now);

    expect(rows).toHaveLength(1);
    expect(rows[0].revenus).toBe(50);
    expect(rows[0].in).toBe(0);
    expect(rows[0].out).toBe(0);
  });

  it('ignores transactions outside the requested window', () => {
    const rows = computeMonthlyCashflow([
      tx({ id: '1', type: 'DEPOSIT', date: '2025-01-01', amount: 999 }),
    ], 2, now);

    expect(rows.reduce((a, r) => a + r.in, 0)).toBe(0);
  });
});
