import { Transaction } from '@patrimo/data-access';

/**
 * "Montant versé" since inception — the money that actually left the user's
 * pocket toward the patrimoine.
 *
 * Per envelope, the larger of:
 *  - net deposits (DEPOSIT − WITHDRAWAL): the true external flow when the
 *    user records their broker deposits;
 *  - net buys (BUY − SELL proceeds, fees included in `amount`): the fallback
 *    for buy-only ledgers where deposits are never recorded.
 *
 * Taking the max per envelope never counts the same euro twice: a recorded
 * deposit already funds that envelope's buys. Inter-envelope transfer legs
 * are internal moves, not fresh money — they are skipped entirely.
 */
export function computeContributed(transactions: readonly Transaction[]): number {
  const perEnvelope = new Map<string, { deposits: number; buys: number }>();
  for (const t of transactions) {
    if (t.transferId) continue;
    const entry = perEnvelope.get(t.envelope) ?? { deposits: 0, buys: 0 };
    // `amount` is qty × price WITHOUT fees/taxes. Money out of pocket
    // includes them on a BUY; net proceeds exclude them on a SELL — the
    // same convention as the backend's fee-aware PRU replay.
    if (t.type === 'DEPOSIT')    entry.deposits += t.amount;
    if (t.type === 'WITHDRAWAL') entry.deposits -= t.amount;
    if (t.type === 'BUY')        entry.buys += t.amount + t.fees + t.taxes;
    if (t.type === 'SELL')       entry.buys -= t.amount - t.fees - t.taxes;
    perEnvelope.set(t.envelope, entry);
  }

  let total = 0;
  for (const { deposits, buys } of perEnvelope.values()) {
    total += Math.max(deposits, buys, 0);
  }
  return total;
}
