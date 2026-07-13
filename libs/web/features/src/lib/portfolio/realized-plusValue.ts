import type { Transaction } from '@patrimo/data-access';

export interface RealizedReport {
  /** Realized P&L on sells dated on or after `sinceDate` (inclusive). */
  realizedSince: number;
  /** Number of SELL units that could not be matched to a prior BUY lot. */
  orphanSellUnits: number;
  /** Number of SELL transactions where at least one unit was orphaned. */
  orphanSellCount: number;
  /**
   * ETFs whose lot queue is empty at the end of the walk AND had at least one
   * SELL — i.e. fully exited positions. Realized PnL is the lifetime fee-aware
   * sum, not restricted to the `sinceDate` window.
   */
  closedPositions: ClosedPosition[];
}

export interface ClosedPosition {
  isin: string;
  realizedPnl: number;
  sellProceeds: number;
  buyCost: number;
  lastSell: string;
}

interface Lot { qty: number; netCostPerUnit: number }
interface PerEtf {
  buyCost: number;
  sellProceeds: number;
  lastSell: string;
  hasSold: boolean;
}

/**
 * Walks every BUY/SELL transaction chronologically per ETF, popping units from
 * the oldest lot first (FIFO), and returns the realized P&L for sells whose
 * date is `>= sinceDate` along with stats on orphan sells (sells that had no
 * prior BUY to match against).
 *
 * Cost basis is fee-aware:
 *   - BUY  net-per-unit = (amount + fees + taxes) / qty — costs raise the basis
 *   - SELL net-per-unit = (amount - fees - taxes) / qty — costs lower the proceeds
 *
 * Same-date BUYs are processed before same-date SELLs so an intraday round
 * trip is matched correctly regardless of which row was inserted first.
 *
 * Transactions with `qty <= 0` or non-finite per-unit prices are skipped so
 * a single malformed CSV row cannot poison the whole figure.
 */
export function computeRealized(transactions: Transaction[], sinceDate: string): RealizedReport {
  const lots = new Map<string, Lot[]>();
  const stats = new Map<string, PerEtf>();
  let realizedSince = 0;
  let orphanUnits   = 0;
  let orphanCount   = 0;

  const ranked = transactions
    .filter(t => t.etf && (t.type === 'BUY' || t.type === 'SELL') && t.qty > 0)
    .slice()
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      // Within a day, process BUYs first so a same-day round trip resolves.
      if (a.type === b.type) return 0;
      return a.type === 'BUY' ? -1 : 1;
    });

  const statsFor = (isin: string): PerEtf => {
    const existing = stats.get(isin);
    if (existing) return existing;
    const fresh: PerEtf = { buyCost: 0, sellProceeds: 0, lastSell: '', hasSold: false };
    stats.set(isin, fresh);
    return fresh;
  };

  for (const t of ranked) {
    const isin = t.etf;
    if (!isin) continue;
    const s = statsFor(isin);

    if (t.type === 'BUY') {
      const netCostPerUnit = (t.amount + t.fees + (t.taxes ?? 0)) / t.qty;
      if (!Number.isFinite(netCostPerUnit)) continue;
      const queue = lots.get(isin) ?? [];
      if (queue.length === 0) lots.set(isin, queue);
      queue.push({ qty: t.qty, netCostPerUnit });
      s.buyCost += t.amount + t.fees + (t.taxes ?? 0);
      continue;
    }

    const netSellPerUnit = (t.amount - t.fees - (t.taxes ?? 0)) / t.qty;
    if (!Number.isFinite(netSellPerUnit)) continue;
    const queue = lots.get(isin) ?? [];
    if (queue.length === 0) lots.set(isin, queue);

    let remaining = t.qty;
    const isInWindow = t.date >= sinceDate;

    while (remaining > 0 && queue.length > 0) {
      const lot = queue[0];
      const take = Math.min(remaining, lot.qty);
      if (isInWindow) {
        realizedSince += take * (netSellPerUnit - lot.netCostPerUnit);
      }
      lot.qty -= take;
      remaining -= take;
      if (lot.qty < 1e-9) queue.shift();
    }

    s.sellProceeds += t.amount - t.fees - (t.taxes ?? 0);
    s.hasSold = true;
    if (t.date > s.lastSell) s.lastSell = t.date;

    if (remaining > 1e-9) {
      orphanUnits += remaining;
      orphanCount += 1;
    }
  }

  const closedPositions: ClosedPosition[] = [];
  for (const [isin, s] of stats) {
    if (!s.hasSold) continue;
    const queue = lots.get(isin);
    const queueEmpty = !queue || queue.every(l => l.qty < 1e-9);
    if (!queueEmpty) continue;
    closedPositions.push({
      isin,
      realizedPnl: s.sellProceeds - s.buyCost,
      sellProceeds: s.sellProceeds,
      buyCost: s.buyCost,
      lastSell: s.lastSell,
    });
  }
  closedPositions.sort((a, b) => b.lastSell.localeCompare(a.lastSell));

  return {
    realizedSince,
    orphanSellUnits: orphanUnits,
    orphanSellCount: orphanCount,
    closedPositions,
  };
}

export function startOfYearISO(now = new Date()): string {
  return `${now.getFullYear()}-01-01`;
}
