import { Inject, Injectable } from '@nestjs/common';
import type { EnvelopeRepository, EtfRepository, Transaction, TransactionRepository, UserPreferencesRepository, WealthSnapshotRepository } from '@patrimo/api-domain';
import { DrawdownDto, EtfStatsDto, FeesYtdDto, PerformanceMetricsDto, PerformancePeriod, PerformanceSeriesDto, WealthCategory, WealthReturnDto, WealthReturnKey, WealthSeriesDto, WealthSnapshotDto } from '@patrimo/contracts';
import { ENVELOPE_REPOSITORY, ETF_REPOSITORY, TRANSACTION_REPOSITORY, USER_PREFERENCES_REPOSITORY, WEALTH_SNAPSHOT_REPOSITORY } from '@patrimo/infrastructure';
import { PriceService } from '../market/price.service';

const BOURSE_GLYPHS = new Set(['pea', 'peapme', 'cto', 'av', 'per', 'pee']);
const LIVRET_GLYPHS = new Set(['livret']);
const IMMO_GLYPHS   = new Set(['immo']);
const CRYPTO_GLYPHS = new Set(['crypto']);
const METAL_GLYPHS  = new Set(['metal']);

function glyphToCategory(glyph: string): WealthCategory {
  if (BOURSE_GLYPHS.has(glyph)) return 'bourse';
  if (LIVRET_GLYPHS.has(glyph)) return 'livret';
  if (IMMO_GLYPHS.has(glyph))   return 'immo';
  if (CRYPTO_GLYPHS.has(glyph)) return 'crypto';
  if (METAL_GLYPHS.has(glyph))  return 'metal';
  return 'cash';
}

// Daily move beyond this is a data artifact (a position's first valuation
// lands a day after its buy on sparse history), not performance — drop it
// from the TWR chain. Mirrors the guard in `getMetrics`; the tight bound also
// rejects a price-glitch spike AND its mirror-image correction the next day,
// which an asymmetric (looser) bound would leave half-counted.
const MAX_DAILY_MOVE = 0.25;

/**
 * Period return from a *clean invested base* and its external-flow series,
 * both aligned to the same daily/weekly axis. `base[i]` is the value of the
 * invested capital (ETF market value for boursier, balance for the rest) and
 * `flows[i]` the external money moved into/out of it on that bucket. Bucket 0
 * is the opening value, so the loops start at 1.
 *
 * Crucially the base is NEVER the cash-inclusive patrimoine series: an
 * unfunded buy drives that negative and a TWR built on it explodes. On a clean
 * base a contribution is neutralised (`base − flow − prev`) and only genuine
 * market/interest moves remain.
 */
function periodReturn(base: number[], flows: number[], spanDays: number): WealthReturnDto {
  const n = base.length;
  if (n < 2) return { eur: 0, twrPct: null, investedReturnPct: null, annualizedPct: null };

  const first = base[0] ?? 0;
  const last  = base[n - 1] ?? 0;
  let netFlows = 0;
  for (let i = 1; i < n; i++) netFlows += flows[i] ?? 0;
  const eur = Number((last - first - netFlows).toFixed(2));

  // Time-weighted return: product of *pure market* daily returns. Skip days
  // with a contribution (a buy/sell or deposit mixes the move with the cash
  // event and end-of-day prices cannot separate them) and implausible jumps.
  // Same rule as `getMetrics`, so the dashboard and the Performance page agree.
  let growth = 1;
  let steps  = 0;
  for (let i = 1; i < n; i++) {
    if ((flows[i] ?? 0) !== 0) continue;
    const prev = base[i - 1];
    if (prev <= 0 || base[i] <= 0) continue;
    const r = base[i] / prev - 1;
    if (!Number.isFinite(r) || Math.abs(r) > MAX_DAILY_MOVE) continue;
    growth *= 1 + r;
    steps++;
  }
  const twrPct = steps >= 1 ? Number(((growth - 1) * 100).toFixed(2)) : null;

  // Return on invested capital: euro P&L over (opening value + net
  // contributions). Untimed on purpose — a time-weighted denominator shrinks
  // toward zero when money is deployed late in a long window and the ratio
  // blows up (the "294 %" trap). This stays the intuitive gain-over-money-in.
  const investedCapital = first + netFlows;
  const investedReturnPct = investedCapital >= 100 ? Number(((eur / investedCapital) * 100).toFixed(2)) : null;

  // Annualise only for windows of at least ~1 year (short-period extrapolation is noise).
  const annualizedPct = twrPct !== null && spanDays >= 360 && growth > 0
    ? Number(((Math.pow(growth, 365 / spanDays) - 1) * 100).toFixed(2))
    : null;

  return { eur, twrPct, investedReturnPct, annualizedPct };
}

const PERIOD_DAYS: Record<PerformancePeriod, number> = {
  '1D':  1,
  '1W':  7,
  '1M':  30,
  '3M':  90,
  '6M':  180,
  '1Y':  365,
  'YTD': 365, // capped at days since Jan 1 in `computeStart`
  '3Y':  1095,
  '5Y':  1825,
  'MAX': 0,   // computed dynamically from earliest BUY transaction
};

const LONG_PERIODS: PerformancePeriod[] = ['3Y', '5Y', 'MAX'];

// Default benchmark when the user has no preference yet: Amundi CW8 (MSCI
// World) listed on Euronext Paris. Overridable per user via the
// `benchmarkIsin` preference, resolved against the ETF catalog.
const DEFAULT_BENCHMARK_ISIN   = 'FR0010261198';
const DEFAULT_BENCHMARK_TICKER = 'CW8';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStart(period: PerformancePeriod, now: Date, earliestTxDate?: Date): Date {
  if (period === 'YTD') return new Date(now.getFullYear(), 0, 1);
  if (period === 'MAX') return earliestTxDate ?? new Date(now.getFullYear(), 0, 1);
  const start = new Date(now);
  start.setDate(start.getDate() - PERIOD_DAYS[period]);
  return start;
}

function enumerateDates(from: Date, to: Date, weekly = false): string[] {
  const out: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    out.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + (weekly ? 7 : 1));
  }
  return out;
}

/**
 * Per-ISIN close lookup that returns, for each `label` called in ascending
 * date order, the latest close at or before that date. Needed because the
 * label axis is computed independently from Yahoo's own candle dates —
 * weekly periods (MAX/3Y/5Y) anchor their labels on the user's first
 * transaction, not on Yahoo's weekly-candle boundary, so an *exact* date
 * match would miss almost every label and silently fall back to cost for
 * the whole series.
 */
function closeWalker(history: Map<string, number>): (label: string) => number | undefined {
  const sorted = Array.from(history.entries()).sort(([a], [b]) => a.localeCompare(b));
  let cursor = 0;
  let last: number | undefined;
  return (label: string) => {
    while (cursor < sorted.length && sorted[cursor][0] <= label) {
      last = sorted[cursor][1];
      cursor++;
    }
    return last;
  };
}

function computeAnnualized(series: number[], days: number): number | null {
  if (days < 365) return null;
  const start = series.find(v => v > 0);
  const end   = series[series.length - 1];
  if (!start || start === 0) return null;
  const years = days / 365.25;
  return Number(((Math.pow(end / start, 1 / years) - 1) * 100).toFixed(2));
}

@Injectable()
export class PerformanceService {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)      private readonly transactionRepository:   TransactionRepository,
    @Inject(ETF_REPOSITORY)              private readonly etfRepository:  EtfRepository,
    @Inject(USER_PREFERENCES_REPOSITORY) private readonly preferencesRepository: UserPreferencesRepository,
    @Inject(ENVELOPE_REPOSITORY)         private readonly envelopeRepository: EnvelopeRepository,
    @Inject(WEALTH_SNAPSHOT_REPOSITORY)  private readonly wealthSnapshotRepository: WealthSnapshotRepository,
    private readonly priceService: PriceService,
  ) {}

  /** Last date a snapshot was persisted per user — avoids one upsert per chart load. */
  private readonly snapshotCapturedOn = new Map<string, string>();

  /**
   * Resolve the user's benchmark preference against the ETF catalog. Falls
   * back to CW8 (MSCI World) when the preference is unset or points to an
   * ISIN that left the catalog.
   */
  private async resolveBenchmark(userId: string): Promise<{ isin: string; ticker: string }> {
    const userPreferences = await this.preferencesRepository.findByUserId(userId);
    const isin  = userPreferences?.benchmarkIsin ?? DEFAULT_BENCHMARK_ISIN;
    if (isin !== DEFAULT_BENCHMARK_ISIN) {
      const etf = await this.etfRepository.findByIsin(isin);
      if (etf) return { isin: etf.isin, ticker: etf.ticker };
    }
    return { isin: DEFAULT_BENCHMARK_ISIN, ticker: DEFAULT_BENCHMARK_TICKER };
  }

  async getSeries(userId: string, period: PerformancePeriod): Promise<PerformanceSeriesDto> {
    const { labels, portfolio, invested, days, isLong } = await this.buildValuation(userId, period);

    const bench = await this.resolveBenchmark(userId);
    const benchmarkHistory = await this.priceService.getHistorical(
      bench.isin, bench.ticker, days, isLong ? '1wk' : '1d',
    );

    const benchmark  = this.buildBenchmark(labels, portfolio, benchmarkHistory);
    const drawdowns  = this.buildDrawdowns(labels, portfolio);
    const annualized = computeAnnualized(portfolio, days);

    return {
      period,
      count: labels.length,
      labels,
      portfolio,
      benchmark,
      invested,
      drawdowns,
      annualized,
    };
  }

  /**
   * Daily valuation replay shared by the series and metrics endpoints. Walks
   * BUY/SELL transactions onto the date axis and, per label, computes:
   *  - `portfolio`: market value (qty × close)
   *  - `invested`:  cost basis of the current holdings (qty × PRU), so
   *    value − invested reads directly as latent P&L
   *  - `flows`:     net external capital deployed that day (BUY cost − SELL
   *    proceeds), used to make the TWR / volatility figures flow-neutral
   */
  private async buildValuation(userId: string, period: PerformancePeriod): Promise<{
    labels: string[]; portfolio: number[]; invested: number[]; flows: number[]; days: number; isLong: boolean;
  }> {
    const now    = new Date();
    const isLong = LONG_PERIODS.includes(period);
    const interval: '1d' | '1wk' = isLong ? '1wk' : '1d';

    const [txs, etfs] = await Promise.all([
      this.transactionRepository.findByUserId(userId),
      this.etfRepository.findAll(),
    ]);

    const buyTxs = txs.filter(t => t.type === 'BUY' && t.etfIsin);
    const earliestTxDate = buyTxs.length > 0
      ? new Date(Math.min(...buyTxs.map(t => t.date.getTime())))
      : undefined;

    const start  = computeStart(period, now, earliestTxDate);
    const labels = enumerateDates(start, now, isLong);
    const days   = period === 'MAX'
      ? Math.ceil((now.getTime() - (earliestTxDate?.getTime() ?? now.getTime())) / 86400000) + 1
      : Math.max(30, PERIOD_DAYS[period]);

    const sortedTxs = txs
      .filter((t): t is Transaction & { etfIsin: string } => t.etfIsin !== null)
      .filter(t => t.type === 'BUY' || t.type === 'SELL')
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const heldIsins = new Set(sortedTxs.map(t => t.etfIsin));
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));

    const closesByIsin = new Map<string, Map<string, number>>();
    await Promise.all(
      Array.from(heldIsins).map(async isin => {
        const etf = etfByIsin.get(isin);
        if (!etf) return;
        const history = await this.priceService.getHistorical(isin, etf.ticker, days, interval);
        closesByIsin.set(isin, new Map(history.map(p => [p.date, p.close])));
      }),
    );

    const qtyByIsin     = new Map<string, number>();
    const buyQtyByIsin  = new Map<string, number>();
    const buyCostByIsin = new Map<string, number>();
    const closeAt = new Map<string, (label: string) => number | undefined>();
    for (const [isin, history] of closesByIsin) closeAt.set(isin, closeWalker(history));
    const portfolio: number[] = [];
    const invested:  number[] = [];
    const flows:     number[] = [];
    let txCursor = 0;

    for (const label of labels) {
      let dayFlow = 0;
      while (txCursor < sortedTxs.length && isoDate(sortedTxs[txCursor].date) <= label) {
        const tx    = sortedTxs[txCursor];
        const sign  = tx.type === 'BUY' ? 1 : -1;
        const price = tx.price ?? 0;
        const costs = (tx.fees ?? 0) + (tx.taxes ?? 0);
        // BUY raises cost by fees/taxes; SELL lowers proceeds by them.
        const gross = tx.quantity * price + (tx.type === 'BUY' ? costs : -costs);
        qtyByIsin.set(tx.etfIsin, (qtyByIsin.get(tx.etfIsin) ?? 0) + sign * tx.quantity);
        if (sign > 0) {
          buyQtyByIsin.set(tx.etfIsin, (buyQtyByIsin.get(tx.etfIsin) ?? 0) + tx.quantity);
          buyCostByIsin.set(tx.etfIsin, (buyCostByIsin.get(tx.etfIsin) ?? 0) + gross);
        }
        dayFlow += sign * gross; // BUY deploys capital, SELL returns it
        txCursor++;
      }

      let value = 0;
      let cost  = 0;
      for (const [isin, qty] of qtyByIsin) {
        if (qty <= 0) continue;
        const close = closeAt.get(isin)?.(label);
        if (close !== undefined) value += qty * close;
        const buyQty  = buyQtyByIsin.get(isin) ?? 0;
        const buyCost = buyCostByIsin.get(isin) ?? 0;
        if (buyQty > 0) cost += qty * (buyCost / buyQty);
      }
      portfolio.push(Number(value.toFixed(2)));
      invested.push(Number(cost.toFixed(2)));
      flows.push(Number(dayFlow.toFixed(2)));
    }

    return { labels, portfolio, invested, flows, days, isLong };
  }

  /**
   * Risk + flow-neutral return metrics over the window. TWR chains *pure
   * market* daily returns (`V_t / V_{t-1} − 1`) and deliberately drops:
   *  - contribution days (`flows[i] !== 0`): a buy/sell mixes cash movement
   *    with market move and the two cannot be cleanly separated when prices
   *    are end-of-day and forward-filled.
   *  - implausible single-day jumps (> 25 %): on sparse / non-trading-day
   *    data a new position's first valuation lands a day after its buy,
   *    producing a catch-up spike that is a data artifact, not performance.
   * What remains is genuine market movement. Volatility / Sharpe / Sortino
   * annualize those returns (252 trading days, or 52 weeks for long periods).
   * Risk-free = 0.
   */
  async getMetrics(userId: string, period: PerformancePeriod): Promise<PerformanceMetricsDto> {
    const { labels, portfolio, flows, isLong } = await this.buildValuation(userId, period);

    const MAX_DAILY_MOVE = 0.25;
    const returns: number[] = [];
    for (let i = 1; i < portfolio.length; i++) {
      if (flows[i] !== 0) continue;                       // contribution day — skip
      const prev = portfolio[i - 1];
      if (prev <= 0 || portfolio[i] <= 0) continue;       // cold / fully-exited day
      const r = portfolio[i] / prev - 1;
      if (Number.isFinite(r) && Math.abs(r) <= MAX_DAILY_MOVE) returns.push(r);
    }

    if (returns.length < 5) {
      return { period, twr: null, volatility: null, sharpe: null, sortino: null, maxDrawdownPct: null };
    }

    const ppy  = isLong ? 52 : 252;
    const n    = returns.length;
    const mean = returns.reduce((a, b) => a + b, 0) / n;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1);
    const std  = Math.sqrt(variance);
    const downsideDev = Math.sqrt(returns.reduce((a, r) => a + (r < 0 ? r * r : 0), 0) / n);

    const twr = (returns.reduce((a, r) => a * (1 + r), 1) - 1) * 100;
    const annualizedReturn = mean * ppy;
    const annualizedVol    = std * Math.sqrt(ppy);
    const annualizedDownside = downsideDev * Math.sqrt(ppy);

    const drawdowns = this.buildDrawdowns(labels, portfolio);
    const round = (x: number) => Number(x.toFixed(2));

    return {
      period,
      twr: round(twr),
      volatility: round(annualizedVol * 100),
      sharpe:  annualizedVol > 0      ? round(annualizedReturn / annualizedVol)      : null,
      sortino: annualizedDownside > 0 ? round(annualizedReturn / annualizedDownside) : null,
      maxDrawdownPct: drawdowns.length > 0 ? drawdowns[0].pct : 0,
    };
  }

  /**
   * Walk the portfolio series, identify every peak-to-trough drawdown, and
   * return the top 3 by absolute depth.
   *
   * A drawdown is opened when the curve dips below the running max, the
   * trough is the lowest point reached while still below that max, and it
   * closes either when a new value matches/exceeds the previous max
   * (recovery) or when the window ends (open drawdown — `recoveryDate` /
   * `recoveryDays` stay `null`).
   *
   * Plateaus inside a drawdown (e.g. weekend carry-forward) do not split
   * the drawdown — the walker only triggers a close on the *recovery* edge.
   */
  private buildDrawdowns(labels: string[], series: number[]): DrawdownDto[] {
    if (series.length < 2) return [];

    // Skip leading zeros (cold portfolio before the first BUY).
    let firstIdx = 0;
    while (firstIdx < series.length && series[firstIdx] === 0) firstIdx++;
    if (firstIdx >= series.length - 1) return [];

    const drawdowns: DrawdownDto[] = [];
    let peakIdx   = firstIdx;
    let peakValue = series[firstIdx];
    let troughIdx = -1;
    let troughValue = peakValue;
    let inDrawdown = false;

    const dayDiff = (aIdx: number, bIdx: number) => bIdx - aIdx;

    for (let i = firstIdx + 1; i < series.length; i++) {
      const v = series[i];
      if (v >= peakValue) {
        // Recovery (or higher high). If we were under water, close the
        // drawdown; otherwise just bump the running peak.
        if (inDrawdown) {
          drawdowns.push({
            peakDate:     labels[peakIdx],
            troughDate:   labels[troughIdx],
            recoveryDate: labels[i],
            pct:          ((troughValue - peakValue) / peakValue) * 100,
            durationDays: dayDiff(peakIdx, troughIdx),
            recoveryDays: dayDiff(troughIdx, i),
          });
          inDrawdown = false;
        }
        peakIdx     = i;
        peakValue   = v;
        troughIdx   = -1;
        troughValue = v;
        continue;
      }

      // Below the running peak.
      if (!inDrawdown) {
        inDrawdown  = true;
        troughIdx   = i;
        troughValue = v;
      } else if (v < troughValue) {
        troughIdx   = i;
        troughValue = v;
      }
    }

    // Flush an open drawdown at the end of the window.
    if (inDrawdown && troughIdx !== -1) {
      drawdowns.push({
        peakDate:     labels[peakIdx],
        troughDate:   labels[troughIdx],
        recoveryDate: null,
        pct:          ((troughValue - peakValue) / peakValue) * 100,
        durationDays: dayDiff(peakIdx, troughIdx),
        recoveryDays: null,
      });
    }

    return drawdowns
      .sort((a, b) => a.pct - b.pct) // most negative first
      .slice(0, 3)
      .map(d => ({ ...d, pct: Number(d.pct.toFixed(2)) }));
  }

  /**
   * Project the MSCI World benchmark on the same `labels` axis and scale it so
   * the curve starts at the same euro value as the portfolio on the first
   * non-zero sample. Returns `null` when Yahoo did not return any close (the
   * controller still serves a valid response — only the benchmark line is
   * dropped on the chart).
   */
  async getEtfStats(userId: string): Promise<EtfStatsDto[]> {
    const bench = await this.resolveBenchmark(userId);
    const [txs, etfs, benchHistory] = await Promise.all([
      this.transactionRepository.findByUserId(userId),
      this.etfRepository.findAll(),
      this.priceService.getHistorical(bench.isin, bench.ticker, 365),
    ]);

    const heldIsins = new Set(
      txs.filter(t => t.etfIsin && (t.type === 'BUY' || t.type === 'SELL'))
         .map(t => t.etfIsin as string),
    );
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));

    const benchReturnMap = new Map(
      benchHistory.slice(1).map((p, i) => [p.date, Math.log(p.close / benchHistory[i].close)]),
    );

    const results: EtfStatsDto[] = [];
    await Promise.allSettled(
      Array.from(heldIsins).map(async isin => {
        const etf = etfByIsin.get(isin);
        if (!etf) return;
        const history = await this.priceService.getHistorical(isin, etf.ticker, 365);
        if (history.length < 10) {
          results.push({ ticker: etf.ticker, name: etf.name, td: null, te: null, return1y: null });
          return;
        }
        const etfReturns = history.slice(1).map((p, i) => Math.log(p.close / history[i].close));
        const return1y = history.length >= 2
          ? (history[history.length - 1].close / history[0].close - 1) * 100
          : null;
        const benchReturn1y = benchHistory.length >= 2
          ? (benchHistory[benchHistory.length - 1].close / benchHistory[0].close - 1) * 100
          : null;
        const td = (return1y !== null && benchReturn1y !== null) ? return1y - benchReturn1y : null;

        const diffs: number[] = [];
        for (const p of history.slice(1)) {
          const er = benchReturnMap.get(p.date);
          const fr = etfReturns[history.slice(1).findIndex(h => h.date === p.date)];
          if (er !== undefined && fr !== undefined) diffs.push(fr - er);
        }
        let te: number | null = null;
        if (diffs.length > 5) {
          const mean  = diffs.reduce((a, b) => a + b, 0) / diffs.length;
          const variance = diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / (diffs.length - 1);
          te = Math.sqrt(variance * 252) * 100;
        }
        results.push({ ticker: etf.ticker, name: etf.name, td, te, return1y });
      }),
    );
    return results.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }

  async getWealthSeries(userId: string, period: PerformancePeriod): Promise<WealthSeriesDto> {
    const now    = new Date();
    const isLong = LONG_PERIODS.includes(period);
    const interval: '1d' | '1wk' = isLong ? '1wk' : '1d';

    const [envelopes, txs, etfs] = await Promise.all([
      this.envelopeRepository.findByUserId(userId),
      this.transactionRepository.findByUserId(userId),
      this.etfRepository.findAll(),
    ]);

    const allDates      = txs.map(t => t.date.getTime());
    const earliestDate  = allDates.length > 0 ? new Date(Math.min(...allDates)) : undefined;
    const start         = computeStart(period, now, earliestDate);
    const labels        = enumerateDates(start, now, isLong);
    const days          = period === 'MAX'
      ? Math.ceil((now.getTime() - (earliestDate?.getTime() ?? now.getTime())) / 86400000) + 1
      : Math.max(30, PERIOD_DAYS[period]);

    // Fetch price history once for all held ISINs (shared across bourse envelopes).
    const heldIsins = new Set(
      txs.filter((t): t is Transaction & { etfIsin: string } => t.etfIsin !== null && (t.type === 'BUY' || t.type === 'SELL'))
         .map(t => t.etfIsin),
    );
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));
    const closesByIsin = new Map<string, Map<string, number>>();
    await Promise.all(
      Array.from(heldIsins).map(async isin => {
        const etf = etfByIsin.get(isin);
        if (!etf) return;
        const history = await this.priceService.getHistorical(isin, etf.ticker, days, interval);
        closesByIsin.set(isin, new Map(history.map(p => [p.date, p.close])));
      }),
    );

    const txsByEnvelope = new Map<string, Transaction[]>();
    for (const tx of txs) {
      const list = txsByEnvelope.get(tx.envelopeId) ?? [];
      list.push(tx);
      txsByEnvelope.set(tx.envelopeId, list);
    }

    const byCategoryArrays      = new Map<WealthCategory, number[]>();
    const flowsByCategoryArrays = new Map<WealthCategory, number[]>();
    const byEnvelope: Record<string, number[]> = {};
    const returnInputsByEnvelope = new Map<string, { base: number[]; flow: number[] }>();
    const total = new Array<number>(labels.length).fill(0);
    const flows = new Array<number>(labels.length).fill(0);

    // Parallel "clean" series, used only to compute returns. The base is the
    // value of invested capital — ETF market value for boursier (never the
    // cash-inclusive chart series, which goes negative on unfunded buys), the
    // balance for everything else. Its flows are the money put into that
    // capital: buys/sells for boursier, deposits/withdrawals elsewhere.
    const returnBaseByCat = new Map<WealthCategory, number[]>();
    const returnFlowByCat = new Map<WealthCategory, number[]>();
    const returnBaseAll = new Array<number>(labels.length).fill(0);
    const returnFlowAll = new Array<number>(labels.length).fill(0);

    const addInto = (map: Map<WealthCategory, number[]>, cat: WealthCategory, src: number[]) => {
      const acc = map.get(cat) ?? new Array<number>(labels.length).fill(0);
      for (let i = 0; i < labels.length; i++) acc[i] = Number((acc[i] + src[i]).toFixed(2));
      map.set(cat, acc);
    };

    for (const envelope of envelopes) {
      const category = glyphToCategory(envelope.glyph);
      const envTxs   = (txsByEnvelope.get(envelope.id) ?? [])
        .slice()
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const isBourse = category === 'bourse';

      // Chart series: cash-inclusive value (boursier) / running balance (rest).
      const chartValue = isBourse
        ? this.buildEnvelopeBoursSeries(labels, envTxs, closesByIsin)
        : this.buildEnvelopeFlowSeries(labels, envTxs);
      // Chart flows: external patrimoine movements (DEPOSIT − WITHDRAWAL).
      const chartFlow = this.buildEnvelopeFlowDeltas(labels, envTxs);

      // Return base/flows: boursier uses ETF market value + buy/sell capital;
      // every other category reuses its balance series and deposit flows.
      const returnBase = isBourse ? this.buildEnvelopeEtfValueSeries(labels, envTxs, closesByIsin) : chartValue;
      const returnFlow = isBourse ? this.buildEnvelopeInvestFlowDeltas(labels, envTxs)             : chartFlow;

      byEnvelope[envelope.id] = chartValue;
      returnInputsByEnvelope.set(envelope.id, { base: returnBase, flow: returnFlow });

      addInto(byCategoryArrays, category, chartValue);
      addInto(flowsByCategoryArrays, category, chartFlow);
      addInto(returnBaseByCat, category, returnBase);
      addInto(returnFlowByCat, category, returnFlow);
      for (let i = 0; i < labels.length; i++) {
        total[i]         = Number((total[i]         + chartValue[i]).toFixed(2));
        flows[i]         = Number((flows[i]         + chartFlow[i]).toFixed(2));
        returnBaseAll[i] = Number((returnBaseAll[i] + returnBase[i]).toFixed(2));
        returnFlowAll[i] = Number((returnFlowAll[i] + returnFlow[i]).toFixed(2));
      }
    }

    const byCategory:      Partial<Record<WealthCategory, number[]>> = {};
    const flowsByCategory: Partial<Record<WealthCategory, number[]>> = {};
    for (const [cat, series] of byCategoryArrays)      byCategory[cat]      = series;
    for (const [cat, series] of flowsByCategoryArrays) flowsByCategory[cat] = series;

    const spanDays = labels.length >= 2
      ? (new Date(labels[labels.length - 1]).getTime() - new Date(labels[0]).getTime()) / 86_400_000
      : 0;
    const returns: Partial<Record<WealthReturnKey, WealthReturnDto>> = {
      all: periodReturn(returnBaseAll, returnFlowAll, spanDays),
    };
    for (const [cat, base] of returnBaseByCat) {
      returns[cat] = periodReturn(base, returnFlowByCat.get(cat) ?? [], spanDays);
    }
    const returnsByEnvelope: Record<string, WealthReturnDto> = {};
    for (const [envelopeId, { base, flow }] of returnInputsByEnvelope) {
      returnsByEnvelope[envelopeId] = periodReturn(base, flow, spanDays);
    }

    if (envelopes.length > 0) {
      await this.captureSnapshot(userId, labels, total, byCategory);
    }

    return { period, labels, total, flows, byCategory, flowsByCategory, byEnvelope, returns, returnsByEnvelope };
  }

  /**
   * Freeze today's valuation as an immutable snapshot (PP8). The chart series
   * recomputes history from transactions + whatever prices Yahoo still serves;
   * the snapshot records what the patrimoine was actually worth today, so
   * long-range charts keep an exact trace even after edits or price-source
   * gaps. Piggybacked on the series computation: no extra fetch, idempotent
   * per day, and never allowed to break the chart response.
   */
  private async captureSnapshot(
    userId: string,
    labels: string[],
    total: number[],
    byCategory: Partial<Record<WealthCategory, number[]>>,
  ): Promise<void> {
    // Same convention as enumerateDates: local midnight, then ISO — otherwise
    // a UTC+N timezone would compare today's label against tomorrow's date.
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const today = isoDate(todayMidnight);
    if (labels.length === 0 || labels[labels.length - 1] !== today) return;
    if (this.snapshotCapturedOn.get(userId) === today) return;
    try {
      const last = labels.length - 1;
      const byCategoryToday: Record<string, number> = {};
      for (const [category, series] of Object.entries(byCategory)) {
        byCategoryToday[category] = series[last];
      }
      await this.wealthSnapshotRepository.upsertForDate({
        userId,
        date: today,
        total: total[last],
        byCategory: byCategoryToday,
      });
      this.snapshotCapturedOn.set(userId, today);
    } catch {
      // Snapshot persistence is best-effort; the chart response must not fail on it.
    }
  }

  /** Stored daily snapshots from `days` ago until today, oldest first. */
  async getWealthSnapshots(userId: string, days: number): Promise<WealthSnapshotDto[]> {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const snapshots = await this.wealthSnapshotRepository.findByUserId(userId, isoDate(from));
    return snapshots.map(s => ({ date: s.date, total: s.total, byCategory: s.byCategory }));
  }

  private buildEnvelopeBoursSeries(
    labels: string[],
    txs: Transaction[],
    closesByIsin: Map<string, Map<string, number>>,
  ): number[] {
    // Process ALL transaction types so the cash balance is tracked alongside
    // ETF positions. Without this, a BUY with no prior DEPOSIT inflates the
    // series (ETF value rises but the cash outflow is invisible), creating
    // phantom "performance". Including cash means BUY is neutral: ETF +X,
    // cash −X, net 0. Only market price movements and income (DIVIDEND/INTEREST)
    // create real gains.
    const sortedTxs = txs.slice().sort((a, b) => a.date.getTime() - b.date.getTime());
    const qtyByIsin   = new Map<string, number>();
    const avgBuyPrice = new Map<string, number>(); // valuation fallback when no close exists
    const buyQty      = new Map<string, number>();
    const buyCost     = new Map<string, number>();
    const closeAt = new Map<string, (label: string) => number | undefined>();
    for (const [isin, history] of closesByIsin) closeAt.set(isin, closeWalker(history));
    let cash   = 0;
    let cursor = 0;
    const series: number[] = [];

    for (const label of labels) {
      while (cursor < sortedTxs.length && isoDate(sortedTxs[cursor].date) <= label) {
        const tx = sortedTxs[cursor];
        const price = tx.price ?? 0;
        const costs = (tx.fees ?? 0) + (tx.taxes ?? 0);
        switch (tx.type) {
          case 'BUY':
            if (tx.etfIsin) {
              qtyByIsin.set(tx.etfIsin, (qtyByIsin.get(tx.etfIsin) ?? 0) + tx.quantity);
              cash -= tx.quantity * price + costs;
              buyQty.set(tx.etfIsin, (buyQty.get(tx.etfIsin) ?? 0) + tx.quantity);
              buyCost.set(tx.etfIsin, (buyCost.get(tx.etfIsin) ?? 0) + tx.quantity * price);
              const bq = buyQty.get(tx.etfIsin) ?? 0;
              if (bq > 0) avgBuyPrice.set(tx.etfIsin, (buyCost.get(tx.etfIsin) ?? 0) / bq);
            }
            break;
          case 'SELL':
            if (tx.etfIsin) {
              qtyByIsin.set(tx.etfIsin, (qtyByIsin.get(tx.etfIsin) ?? 0) - tx.quantity);
              cash += tx.quantity * price - costs;
            }
            break;
          case 'DEPOSIT':    cash += tx.amount; break;
          case 'WITHDRAWAL': cash -= tx.amount; break;
          case 'DIVIDEND':
          case 'INTEREST':   cash += tx.amount; break;
        }
        cursor++;
      }

      let etfValue = 0;
      for (const [isin, qty] of qtyByIsin) {
        if (qty <= 0) continue;
        // Latest close at or before this label → average buy price, so a
        // missing price history values the position at cost rather than zero.
        const close = closeAt.get(isin)?.(label) ?? avgBuyPrice.get(isin);
        if (close !== undefined) etfValue += qty * close;
      }
      // Total = market value of ETF positions + cash balance.
      // Cash can be negative (unfunded BUY) which correctly offsets the ETF gain.
      series.push(Number((etfValue + cash).toFixed(2)));
    }
    return series;
  }

  private buildEnvelopeFlowSeries(labels: string[], txs: Transaction[]): number[] {
    const flowTxs = txs.filter(
      t => t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL' || t.type === 'INTEREST' || t.type === 'DIVIDEND',
    );
    let value  = 0;
    let cursor = 0;
    const series: number[] = [];

    for (const label of labels) {
      while (cursor < flowTxs.length && isoDate(flowTxs[cursor].date) <= label) {
        const tx = flowTxs[cursor];
        value += tx.type === 'WITHDRAWAL' ? -tx.amount : tx.amount;
        cursor++;
      }
      series.push(Number(value.toFixed(2)));
    }
    return series;
  }

  /**
   * Per-bucket net external flow (DEPOSIT − WITHDRAWAL) for one envelope,
   * aligned to `labels`. Each flow lands in the first label on/after its date
   * (same cursor logic as the value series, so daily and weekly axes agree).
   * Transactions before the first label fall into bucket 0 (opening capital).
   * Used to neutralise contributions when measuring a period's return.
   */
  private buildEnvelopeFlowDeltas(labels: string[], txs: Transaction[]): number[] {
    const flowTxs = txs
      .filter(t => t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const deltas = new Array<number>(labels.length).fill(0);
    let cursor = 0;

    for (let i = 0; i < labels.length; i++) {
      let bucket = 0;
      while (cursor < flowTxs.length && isoDate(flowTxs[cursor].date) <= labels[i]) {
        const tx = flowTxs[cursor];
        bucket += tx.type === 'WITHDRAWAL' ? -tx.amount : tx.amount;
        cursor++;
      }
      deltas[i] = Number(bucket.toFixed(2));
    }
    return deltas;
  }

  /**
   * Market value of a boursier envelope's ETF positions per label (qty × close,
   * last close carried over gaps). Unlike `buildEnvelopeBoursSeries` this holds
   * NO cash, so the series never goes negative on an unfunded buy — the clean
   * base a TWR needs. Buys/sells enter the return as flows, not value jumps.
   */
  private buildEnvelopeEtfValueSeries(
    labels: string[],
    txs: Transaction[],
    closesByIsin: Map<string, Map<string, number>>,
  ): number[] {
    const sortedTxs = txs
      .filter((t): t is Transaction & { etfIsin: string } => t.etfIsin !== null && (t.type === 'BUY' || t.type === 'SELL'))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const qtyByIsin   = new Map<string, number>();
    const avgBuyPrice = new Map<string, number>(); // valuation fallback when no close exists
    const buyQty      = new Map<string, number>();
    const buyCost     = new Map<string, number>();
    const closeAt = new Map<string, (label: string) => number | undefined>();
    for (const [isin, history] of closesByIsin) closeAt.set(isin, closeWalker(history));
    let cursor = 0;
    const series: number[] = [];

    for (const label of labels) {
      while (cursor < sortedTxs.length && isoDate(sortedTxs[cursor].date) <= label) {
        const tx   = sortedTxs[cursor];
        const sign = tx.type === 'BUY' ? 1 : -1;
        qtyByIsin.set(tx.etfIsin, (qtyByIsin.get(tx.etfIsin) ?? 0) + sign * tx.quantity);
        if (tx.type === 'BUY') {
          buyQty.set(tx.etfIsin, (buyQty.get(tx.etfIsin) ?? 0) + tx.quantity);
          buyCost.set(tx.etfIsin, (buyCost.get(tx.etfIsin) ?? 0) + tx.quantity * (tx.price ?? 0));
          const bq = buyQty.get(tx.etfIsin) ?? 0;
          if (bq > 0) avgBuyPrice.set(tx.etfIsin, (buyCost.get(tx.etfIsin) ?? 0) / bq);
        }
        cursor++;
      }
      let value = 0;
      for (const [isin, qty] of qtyByIsin) {
        if (qty <= 0) continue;
        // Latest close at or before this label → average buy price. The
        // second fallback is critical: when price history is unavailable
        // (Yahoo down, a weekly range that never cached), valuing at cost
        // yields 0 P&L instead of a catastrophic −100 % (position priced at 0).
        const close = closeAt.get(isin)?.(label) ?? avgBuyPrice.get(isin);
        if (close !== undefined) value += qty * close;
      }
      series.push(Number(value.toFixed(2)));
    }
    return series;
  }

  /**
   * Capital deployed into positions per bucket: BUY adds (cost incl. fees),
   * SELL returns (proceeds net of fees). This is the flow that neutralises a
   * purchase against the ETF-value base, leaving only the market move.
   */
  private buildEnvelopeInvestFlowDeltas(labels: string[], txs: Transaction[]): number[] {
    const tradeTxs = txs
      .filter(t => t.etfIsin !== null && (t.type === 'BUY' || t.type === 'SELL'))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const deltas = new Array<number>(labels.length).fill(0);
    let cursor = 0;

    for (let i = 0; i < labels.length; i++) {
      let bucket = 0;
      while (cursor < tradeTxs.length && isoDate(tradeTxs[cursor].date) <= labels[i]) {
        const tx    = tradeTxs[cursor];
        const sign  = tx.type === 'BUY' ? 1 : -1;
        const price = tx.price ?? 0;
        const costs = (tx.fees ?? 0) + (tx.taxes ?? 0);
        bucket += sign * (tx.quantity * price) + (tx.type === 'BUY' ? costs : -costs);
        cursor++;
      }
      deltas[i] = Number(bucket.toFixed(2));
    }
    return deltas;
  }

  async getFeesYtd(userId: string): Promise<FeesYtdDto> {
    const now     = new Date();
    const jan1    = new Date(now.getFullYear(), 0, 1);
    const elapsed = (now.getTime() - jan1.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    const [txs, etfs] = await Promise.all([
      this.transactionRepository.findByUserId(userId),
      this.etfRepository.findAll(),
    ]);

    const brokerageYtd = txs
      .filter(t => t.date >= jan1 && (t.type === 'BUY' || t.type === 'SELL'))
      .reduce((a, t) => a + (t.fees ?? 0), 0);

    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));
    const qtyMap    = new Map<string, number>();
    for (const t of txs) {
      if (!t.etfIsin || (t.type !== 'BUY' && t.type !== 'SELL')) continue;
      qtyMap.set(t.etfIsin, (qtyMap.get(t.etfIsin) ?? 0) + (t.type === 'BUY' ? t.quantity : -t.quantity));
    }

    const byEtf: FeesYtdDto['byEtf'] = [];
    await Promise.allSettled(
      Array.from(qtyMap.entries())
        .filter(([, qty]) => qty > 0)
        .map(async ([isin, qty]) => {
          const etf  = etfByIsin.get(isin);
          if (!etf) return;
          const quote = await this.priceService.getQuote(isin, etf.ticker);
          const price = quote.price ?? 0;
          const value = qty * price;
          // `etf.ter` is expressed in percent points (0.15 = 0.15 %/yr).
          const ter   = etf.ter ?? 0;
          byEtf.push({
            ticker:    etf.ticker,
            name:      etf.name,
            ter,
            value,
            terDragYtd: Number(((ter / 100) * value * elapsed).toFixed(2)),
          });
        }),
    );

    byEtf.sort((a, b) => b.terDragYtd - a.terDragYtd);
    const terDragYtd = byEtf.reduce((a, r) => a + r.terDragYtd, 0);
    return { brokerageYtd, terDragYtd, totalYtd: brokerageYtd + terDragYtd, byEtf };
  }

  private buildBenchmark(
    labels: string[],
    portfolio: number[],
    history: { date: string; close: number }[],
  ): number[] | null {
    if (history.length === 0) return null;

    // Find the first label that has both a non-zero portfolio value AND a
    // benchmark close — that becomes the anchor point.
    const benchMap = new Map(history.map(p => [p.date, p.close]));
    let lastClose: number | undefined;
    const closeByLabel: (number | undefined)[] = labels.map(l => {
      const c = benchMap.get(l) ?? lastClose;
      if (c !== undefined) lastClose = c;
      return c;
    });

    let anchorIndex = -1;
    for (let i = 0; i < labels.length; i++) {
      if (portfolio[i] > 0 && closeByLabel[i] !== undefined) { anchorIndex = i; break; }
    }
    if (anchorIndex === -1) return null;

    const anchorClose     = closeByLabel[anchorIndex] as number;
    const anchorPortfolio = portfolio[anchorIndex];

    return labels.map((_, i) => {
      const close = closeByLabel[i];
      if (close === undefined) return 0;
      return Number(((close / anchorClose) * anchorPortfolio).toFixed(2));
    });
  }
}
