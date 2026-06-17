import { Inject, Injectable } from '@nestjs/common';
import type { EnvelopeRepository, EtfRepository, Transaction, TransactionRepository, UserPreferencesRepository } from '@patrimo/api-domain';
import { DrawdownDto, EtfStatsDto, FeesYtdDto, PerformanceMetricsDto, PerformancePeriod, PerformanceSeriesDto, WealthCategory, WealthSeriesDto } from '@patrimo/contracts';
import { ENVELOPE_REPOSITORY, ETF_REPOSITORY, TRANSACTION_REPOSITORY, USER_PREFERENCES_REPOSITORY } from '@patrimo/infrastructure';
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

const PERIOD_DAYS: Record<PerformancePeriod, number> = {
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
    private readonly priceService: PriceService,
  ) {}

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
    const lastClose     = new Map<string, number>();
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
        const close = closesByIsin.get(isin)?.get(label) ?? lastClose.get(isin);
        if (close !== undefined) { lastClose.set(isin, close); value += qty * close; }
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

    const byCategoryArrays = new Map<WealthCategory, number[]>();
    const total = new Array<number>(labels.length).fill(0);

    for (const envelope of envelopes) {
      const category = glyphToCategory(envelope.glyph);
      const envTxs   = (txsByEnvelope.get(envelope.id) ?? [])
        .slice()
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const series = category === 'bourse'
        ? this.buildEnvelopeBoursSeries(labels, envTxs, closesByIsin)
        : this.buildEnvelopeFlowSeries(labels, envTxs);

      const existing = byCategoryArrays.get(category) ?? new Array<number>(labels.length).fill(0);
      for (let i = 0; i < labels.length; i++) {
        existing[i] = Number((existing[i] + series[i]).toFixed(2));
        total[i]    = Number((total[i]    + series[i]).toFixed(2));
      }
      byCategoryArrays.set(category, existing);
    }

    const byCategory: Partial<Record<WealthCategory, number[]>> = {};
    for (const [cat, series] of byCategoryArrays) byCategory[cat] = series;

    return { period, labels, total, byCategory };
  }

  private buildEnvelopeBoursSeries(
    labels: string[],
    txs: Transaction[],
    closesByIsin: Map<string, Map<string, number>>,
  ): number[] {
    const boursTxs = txs.filter(
      (t): t is Transaction & { etfIsin: string } => t.etfIsin !== null && (t.type === 'BUY' || t.type === 'SELL'),
    );
    const qtyByIsin = new Map<string, number>();
    const lastClose = new Map<string, number>();
    let cursor = 0;
    const series: number[] = [];

    for (const label of labels) {
      while (cursor < boursTxs.length && isoDate(boursTxs[cursor].date) <= label) {
        const tx   = boursTxs[cursor];
        const sign = tx.type === 'BUY' ? 1 : -1;
        qtyByIsin.set(tx.etfIsin, (qtyByIsin.get(tx.etfIsin) ?? 0) + sign * tx.quantity);
        cursor++;
      }
      let value = 0;
      for (const [isin, qty] of qtyByIsin) {
        if (qty <= 0) continue;
        const close = closesByIsin.get(isin)?.get(label) ?? lastClose.get(isin);
        if (close !== undefined) { lastClose.set(isin, close); value += qty * close; }
      }
      series.push(Number(value.toFixed(2)));
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
          const ter   = etf.ter ?? 0;
          byEtf.push({
            ticker:    etf.ticker,
            name:      etf.name,
            ter:       ter * 100,
            value,
            terDragYtd: Number((ter * value * elapsed).toFixed(2)),
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
