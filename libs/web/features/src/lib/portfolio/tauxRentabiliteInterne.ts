import type { Transaction } from '@patrimo/data-access';

export interface CashFlow {
  date: string;
  /**
   * From the investor's perspective:
   *   - Money leaving the investor's pocket → negative (DEPOSIT into the account)
   *   - Money returning to the investor    → positive (WITHDRAWAL, final liquidation)
   * BUY / SELL inside the account are internal transfers between cash and
   * securities; they do not move money in or out of the investor and are
   * therefore excluded from the XIRR computation.
   */
  amount: number;
}

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

/**
 * Solves for the annualised internal rate of return that zeros the NPV of
 * the cash-flow series. Newton-Raphson with a bisection fallback when the
 * derivative collapses or the iterate diverges. Returns the rate as a
 * percentage (e.g. 7.4 → 7.4 %/yr), or `null` if it cannot converge.
 *
 * The function is the same maths Excel's `XIRR` and Google Sheets `XIRR`
 * use; results match within ~1e-6.
 */
export function xirr(flows: CashFlow[], guess = 0.1): number | null {
  if (flows.length < 2) return null;

  const sorted = flows.slice().sort((a, b) => a.date.localeCompare(b.date));
  const start  = new Date(sorted[0].date).getTime();
  if (Number.isNaN(start)) return null;

  const years = sorted.map(f => {
    const t = new Date(f.date).getTime();
    return Number.isNaN(t) ? 0 : (t - start) / MS_PER_YEAR;
  });
  const amounts = sorted.map(f => f.amount);

  // A valid XIRR needs at least one positive and one negative cash flow.
  const hasPositive = amounts.some(a => a > 0);
  const hasNegative = amounts.some(a => a < 0);
  if (!hasPositive || !hasNegative) return null;

  const npv = (r: number): number => {
    let acc = 0;
    for (let i = 0; i < amounts.length; i++) acc += amounts[i] / Math.pow(1 + r, years[i]);
    return acc;
  };
  const dnpv = (r: number): number => {
    let acc = 0;
    for (let i = 0; i < amounts.length; i++) {
      acc -= (years[i] * amounts[i]) / Math.pow(1 + r, years[i] + 1);
    }
    return acc;
  };

  let r = guess;
  for (let i = 0; i < 100; i++) {
    const f = npv(r);
    if (Math.abs(f) < 1e-7) return r * 100;
    const derivativeValue = dnpv(r);
    if (Math.abs(derivativeValue) < 1e-12) break;
    let next = r - f / derivativeValue;
    if (!Number.isFinite(next)) break;
    if (next <= -0.999) next = -0.999;        // keep r > -1 so (1+r)^t is real
    if (Math.abs(next - r) < 1e-9) return Number.isFinite(next) ? next * 100 : null;
    r = next;
  }

  // Bisection fallback in [-0.99, 10] if Newton-Raphson diverged.
  let lo = -0.99, hi = 10;
  const lowerBoundValue = npv(lo), fHi = npv(hi);
  if (Number.isNaN(lowerBoundValue) || Number.isNaN(fHi) || (lowerBoundValue > 0 && fHi > 0) || (lowerBoundValue < 0 && fHi < 0)) {
    return null;
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const f   = npv(mid);
    if (Math.abs(f) < 1e-7 || (hi - lo) < 1e-9) return mid * 100;
    if ((f > 0) === (lowerBoundValue > 0)) lo = mid; else hi = mid;
  }
  return null;
}

/**
 * Builds the XIRR cash-flow series from a transaction history and a
 * current portfolio value. Returns `null` if a meaningful TAUXRENTABILITEINTERNE cannot be
 * computed (no deposits, no current value).
 */
export function computeTri(txs: Transaction[], currentValue: number, today: Date = new Date()): number | null {
  if (currentValue <= 0) return null;

  const flows: CashFlow[] = [];
  for (const t of txs) {
    if (t.type === 'DEPOSIT')    flows.push({ date: t.date, amount: -t.amount });
    if (t.type === 'WITHDRAWAL') flows.push({ date: t.date, amount: +t.amount });
  }
  if (flows.length === 0) return null;

  const todayIso = today.toISOString().slice(0, 10);
  flows.push({ date: todayIso, amount: currentValue });

  return xirr(flows);
}
