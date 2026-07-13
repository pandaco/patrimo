import type { Transaction } from '@patrimo/data-access';

export interface MonthlyCashflow {
  /** ISO month, `YYYY-MM`. */
  month: string;
  /** Sum of DEPOSIT transactions — money the user put in. */
  in: number;
  /** Sum of WITHDRAWAL transactions — money the user took out. */
  out: number;
  /** Sum of DIVIDEND + INTEREST — investment return, not external flow (see `performance.dto.ts`). */
  revenus: number;
  /** `in - out`, the net external contribution for the month. */
  net: number;
}

/**
 * Groups DEPOSIT/WITHDRAWAL transactions by calendar month over the trailing
 * `months` window, following the same in/out convention as the TWR flow
 * neutralisation and `computeTri`: dividends/interest are investment return,
 * not an external cash flow, so they're reported separately as `revenus`.
 * Months with no activity still appear, at 0, so the chart stays continuous.
 */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function computeMonthlyCashflow(
  transactions: Transaction[],
  months = 12,
  now = new Date(),
): MonthlyCashflow[] {
  const buckets = new Map<string, MonthlyCashflow>();
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 0; i < months; i++) {
    const key = monthKey(cursor);
    buckets.set(key, { month: key, in: 0, out: 0, revenus: 0, net: 0 });
    cursor.setMonth(cursor.getMonth() - 1);
  }

  for (const transaction of transactions) {
    const key = transaction.date.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (transaction.type === 'DEPOSIT') bucket.in += transaction.amount;
    else if (transaction.type === 'WITHDRAWAL') bucket.out += transaction.amount;
    else if (transaction.type === 'DIVIDEND' || transaction.type === 'INTEREST') bucket.revenus += transaction.amount;
  }

  for (const bucket of buckets.values()) bucket.net = bucket.in - bucket.out;

  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
}
