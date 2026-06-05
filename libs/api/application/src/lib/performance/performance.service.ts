import { Inject, Injectable } from '@nestjs/common';
import type { EtfRepository, Transaction, TransactionRepository } from '@patrimo/api-domain';
import { DrawdownDto, PerformancePeriod, PerformanceSeriesDto } from '@patrimo/contracts';
import { ETF_REPOSITORY, TRANSACTION_REPOSITORY } from '@patrimo/infrastructure';
import { PriceService } from '../market/price.service';

const PERIOD_DAYS: Record<PerformancePeriod, number> = {
  '1M':  30,
  '3M':  90,
  '6M':  180,
  '1Y':  365,
  'YTD': 365, // capped at days since Jan 1 in `computeStart`
};

// MSCI World tracker used as the implicit benchmark: Amundi CW8 listed on
// Euronext Paris. Hardcoded for now — the Allocation cible endpoint will let
// the user pick another reference index later.
const BENCHMARK_ISIN   = 'FR0010261198';
const BENCHMARK_TICKER = 'CW8';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStart(period: PerformancePeriod, now: Date): Date {
  if (period === 'YTD') return new Date(now.getFullYear(), 0, 1);
  const start = new Date(now);
  start.setDate(start.getDate() - PERIOD_DAYS[period]);
  return start;
}

function enumerateDates(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    out.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

@Injectable()
export class PerformanceService {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo:  TransactionRepository,
    @Inject(ETF_REPOSITORY)         private readonly etfRepo: EtfRepository,
    private readonly priceService: PriceService,
  ) {}

  async getSeries(userId: string, period: PerformancePeriod): Promise<PerformanceSeriesDto> {
    const now    = new Date();
    const start  = computeStart(period, now);
    const labels = enumerateDates(start, now);
    const days   = Math.max(30, PERIOD_DAYS[period]);

    const [txs, etfs, benchmarkHistory] = await Promise.all([
      this.txRepo.findByUserId(userId),
      this.etfRepo.findAll(),
      this.priceService.getHistorical(BENCHMARK_ISIN, BENCHMARK_TICKER, days),
    ]);

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
        const history = await this.priceService.getHistorical(isin, etf.ticker, days);
        closesByIsin.set(isin, new Map(history.map(p => [p.date, p.close])));
      }),
    );

    const qtyByIsin   = new Map<string, number>();
    const lastClose   = new Map<string, number>();
    const portfolio: number[] = [];
    let txCursor = 0;

    for (const label of labels) {
      while (txCursor < sortedTxs.length && isoDate(sortedTxs[txCursor].date) <= label) {
        const tx = sortedTxs[txCursor];
        const sign = tx.type === 'BUY' ? 1 : -1;
        qtyByIsin.set(tx.etfIsin, (qtyByIsin.get(tx.etfIsin) ?? 0) + sign * tx.quantity);
        txCursor++;
      }
      let value = 0;
      for (const [isin, qty] of qtyByIsin) {
        if (qty <= 0) continue;
        const close = closesByIsin.get(isin)?.get(label) ?? lastClose.get(isin);
        if (close === undefined) continue;
        lastClose.set(isin, close);
        value += qty * close;
      }
      portfolio.push(Number(value.toFixed(2)));
    }

    const benchmark = this.buildBenchmark(labels, portfolio, benchmarkHistory);
    const drawdowns = this.buildDrawdowns(labels, portfolio);

    return {
      period,
      count: labels.length,
      labels,
      portfolio,
      benchmark,
      drawdowns,
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
