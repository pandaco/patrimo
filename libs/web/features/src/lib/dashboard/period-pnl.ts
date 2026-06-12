import { Transaction } from '@patrimo/data-access';

export interface PeriodPnl {
  /** Euro gain/loss over the window, net of deposits and withdrawals. */
  eur: number;
  /** Percentage relative to the capital engaged over the window. `null` when the base is too small. */
  pct: number | null;
}

/**
 * P&L of the portfolio over a performance window, corrected for cash flows.
 *
 * The portfolio series tracks market *value*, so a BUY mid-window inflates
 * the end value without being a gain. The correction subtracts net invested
 * amounts (BUY − SELL) dated strictly after the window start — the start
 * sample already includes same-day transactions (the backend replays
 * `txDate <= label`).
 *
 * The percentage is relative to the capital engaged: starting value plus
 * net contributions when positive. Below €1 of base the ratio is meaningless
 * (fresh account edge case) and `null` is returned instead.
 */
export function computePeriodPnl(
  labels: string[],
  portfolio: number[],
  transactions: Pick<Transaction, 'date' | 'type' | 'amount'>[],
): PeriodPnl | null {
  if (labels.length < 2 || portfolio.length !== labels.length) return null;

  let startIndex = 0;
  while (startIndex < portfolio.length && portfolio[startIndex] === 0) startIndex++;
  if (startIndex >= portfolio.length - 1) return null;

  const startValue = portfolio[startIndex];
  const endValue   = portfolio[portfolio.length - 1];
  const startLabel = labels[startIndex];
  const endLabel   = labels[labels.length - 1];

  let netInvested = 0;
  for (const transaction of transactions) {
    if (transaction.date <= startLabel || transaction.date > endLabel) continue;
    if (transaction.type === 'BUY')  netInvested += transaction.amount;
    if (transaction.type === 'SELL') netInvested -= transaction.amount;
  }

  const eur  = endValue - startValue - netInvested;
  const base = startValue + Math.max(0, netInvested);
  const pct  = base >= 1 ? (eur / base) * 100 : null;

  return { eur, pct: pct !== null && Number.isFinite(pct) ? pct : null };
}
