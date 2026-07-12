import { describe, expect, it } from 'vitest';
import { Transaction, TransactionType } from '@patrimo/data-access';
import { computeContributed } from './contributed';

function tx(overrides: Partial<Transaction> & { type: TransactionType; amount: number }): Transaction {
  return {
    id: 'tx-' + Math.random(),
    date: '2026-01-15',
    envelope: 'env-1',
    etf: null,
    qty: 0,
    price: null,
    fees: 0,
    taxes: 0,
    transferId: null,
    ...overrides,
  };
}

describe('computeContributed', () => {
  it('returns 0 with no transactions', () => {
    expect(computeContributed([])).toBe(0);
  });

  it('uses net deposits when the user records them (deposits fund the buys — no double count)', () => {
    // 1 000 € deposited, 800 € of it converted into ETFs: versé = 1 000, not 1 800.
    const txs = [
      tx({ type: 'DEPOSIT', amount: 1000 }),
      tx({ type: 'BUY', amount: 800 }),
    ];
    expect(computeContributed(txs)).toBe(1000);
  });

  it('falls back to net buys for buy-only ledgers (broker deposits never recorded)', () => {
    const txs = [
      tx({ type: 'BUY', amount: 500 }),
      tx({ type: 'BUY', amount: 300 }),
      tx({ type: 'SELL', amount: 100 }),
    ];
    expect(computeContributed(txs)).toBe(700);
  });

  it('counts brokerage fees and taxes: they leave the pocket on a BUY and shrink SELL proceeds', () => {
    const txs = [
      tx({ type: 'BUY', amount: 1000, fees: 5, taxes: 2 }),   // 1 007 € réellement décaissés
      tx({ type: 'SELL', amount: 200, fees: 3, taxes: 1 }),   // 196 € réellement encaissés
    ];
    expect(computeContributed(txs)).toBe(811);
  });

  it('sums envelopes independently, each with its own convention', () => {
    const txs = [
      // PEA: proper ledger — deposits recorded.
      tx({ type: 'DEPOSIT', amount: 1000, envelope: 'pea' }),
      tx({ type: 'BUY', amount: 900, envelope: 'pea' }),
      // CTO: buy-only ledger.
      tx({ type: 'BUY', amount: 400, envelope: 'cto' }),
    ];
    expect(computeContributed(txs)).toBe(1400);
  });

  it('subtracts withdrawals and never counts a fully-withdrawn envelope negatively', () => {
    const txs = [
      tx({ type: 'DEPOSIT', amount: 500, envelope: 'livret' }),
      tx({ type: 'WITHDRAWAL', amount: 800, envelope: 'livret' }), // over-withdrawn (partial history)
    ];
    expect(computeContributed(txs)).toBe(0);
  });

  it('ignores inter-envelope transfer legs — moving money is not fresh money', () => {
    const txs = [
      tx({ type: 'DEPOSIT', amount: 1000, envelope: 'pea' }),
      // 300 € transferred PEA → CTO: two linked legs.
      tx({ type: 'WITHDRAWAL', amount: 300, envelope: 'pea', transferId: 't-1' }),
      tx({ type: 'DEPOSIT', amount: 300, envelope: 'cto', transferId: 't-1' }),
    ];
    expect(computeContributed(txs)).toBe(1000);
  });
});
