import { describe, expect, it } from 'vitest';
import type { Transaction, TransactionType } from '@patrimo/data-access';
import { computeTaxEstimate } from './tax-estimate';

function transaction(partial: Partial<Transaction> & { id: string; type: TransactionType; date: string; envelope: string }): Transaction {
  return {
    id:       partial.id,
    date:     partial.date,
    type:     partial.type,
    envelope: partial.envelope,
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
const NOW = new Date('2026-06-13');

const ENVELOPES = [
  { id: 'cto', code: 'CTO', openedAt: '2022-01-20' },
  { id: 'pea', code: 'PEA', openedAt: '2020-06-01' }, // 5y reached 2025-06-01 → eligible at NOW
  { id: 'pea-young', code: 'PEA', openedAt: '2024-03-04' },
];

describe('computeTaxEstimate — French regimes', () => {
  it('taxes a CTO realized gain at the 30% PFU', () => {
    const transactions = [
      transaction({ id: 'a', type: 'BUY',  date: '2025-06-01', envelope: 'cto', qty: 10, amount: 1000 }),
      transaction({ id: 'b', type: 'SELL', date: '2026-02-01', envelope: 'cto', qty: 10, amount: 1200 }),
    ];
    const estimation = computeTaxEstimate(transactions, ENVELOPES, Y, NOW);
    expect(estimation.taxableRealizedYtd).toBeCloseTo(200);
    expect(estimation.incomeTax).toBeCloseTo(25.6);   // 200 × 12.8%
    expect(estimation.socialTax).toBeCloseTo(34.4);   // 200 × 17.2%
    expect(estimation.pfuTotal).toBeCloseTo(60);      // 200 × 30%
  });

  it('does not tax a PEA realized gain (deferred)', () => {
    const transactions = [
      transaction({ id: 'a', type: 'BUY',  date: '2025-06-01', envelope: 'pea', qty: 10, amount: 1000 }),
      transaction({ id: 'b', type: 'SELL', date: '2026-02-01', envelope: 'pea', qty: 10, amount: 1500 }),
    ];
    const estimation = computeTaxEstimate(transactions, ENVELOPES, Y, NOW);
    expect(estimation.taxableRealizedYtd).toBe(0);
    expect(estimation.deferredRealizedYtd).toBeCloseTo(500);
    expect(estimation.pfuTotal).toBe(0);
  });

  it('reports PEA five-year eligibility', () => {
    const estimation = computeTaxEstimate([], ENVELOPES, Y, NOW);
    const old = estimation.peaStatuses.find(p => p.openedAt === '2020-06-01');
    const young = estimation.peaStatuses.find(p => p.openedAt === '2024-03-04');
    expect(old?.eligible).toBe(true);
    expect(young?.eligible).toBe(false);
    expect(young?.monthsLeft).toBeGreaterThan(0);
  });

  it('ignores realized losses in the taxable base', () => {
    const transactions = [
      transaction({ id: 'a', type: 'BUY',  date: '2025-06-01', envelope: 'cto', qty: 10, amount: 1000 }),
      transaction({ id: 'b', type: 'SELL', date: '2026-02-01', envelope: 'cto', qty: 10, amount: 800 }),
    ];
    const estimation = computeTaxEstimate(transactions, ENVELOPES, Y, NOW);
    expect(estimation.taxableRealizedYtd).toBe(0);
    expect(estimation.pfuTotal).toBe(0);
  });
});
