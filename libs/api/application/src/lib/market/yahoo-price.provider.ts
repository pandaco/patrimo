import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { Quote } from './price-cache.service';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function pickNumber(record: unknown, key: string): number | null {
  if (typeof record !== 'object' || record === null) return null;
  const value = (record as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface HistoricalPoint {
  /** ISO `YYYY-MM-DD`. */
  date:  string;
  close: number;
}

export interface SymbolCandidate {
  symbol:   string;
  name:     string;
  exchange: string;
  /** Yahoo quote type, e.g. `ETF`, `EQUITY`, `MUTUALFUND`. */
  type:     string;
}

@Injectable()
export class YahooPriceProvider {
  private readonly logger = new Logger(YahooPriceProvider.name);

  async fetch(symbol: string): Promise<Quote> {
    try {
      const response = await yahooFinance.quote(symbol);
      const quote = Array.isArray(response) ? response[0] : response;
      return {
        price:     pickNumber(quote, 'regularMarketPrice'),
        prevClose: pickNumber(quote, 'regularMarketPreviousClose'),
      };
    } catch (err) {
      this.logger.warn(`Yahoo Finance lookup failed for ${symbol}: ${(err as Error).message}`);
      return { price: null, prevClose: null };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async fetchMetadata(symbol: string): Promise<any> {
    try {
      const response = await yahooFinance.quoteSummary(symbol, {
        modules: ['assetProfile', 'fundProfile', 'summaryDetail', 'calendarEvents', 'topHoldings'],
      });
      return response;
    } catch (err) {
      this.logger.warn(`Yahoo Finance metadata failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Currency, last price and — when Yahoo discloses it — the fund's expense
   * ratio (TER) for a search candidate. US-listed funds usually expose the
   * ratio, European UCITS only sometimes; `ter` is in percent (0.07 = 0.07 %).
   * No cache: lookup-time only.
   */
  async fetchSearchDetail(symbol: string): Promise<{ currency: string | null; price: number | null; ter: number | null }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summary: any = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'fundProfile'] });
      const ratio = pickNumber(summary?.fundProfile?.feesExpensesInvestment, 'annualReportExpenseRatio');
      return {
        currency: typeof summary?.price?.currency === 'string' ? summary.price.currency : null,
        price:    pickNumber(summary?.price, 'regularMarketPrice'),
        ter:      ratio !== null ? Number((ratio * 100).toFixed(2)) : null,
      };
    } catch {
      // quoteSummary is rejected for some symbols where a plain quote works —
      // degrade to price + currency without the expense ratio.
      try {
        const response = await yahooFinance.quote(symbol);
        const quote = Array.isArray(response) ? response[0] : response;
        const record = quote as Record<string, unknown>;
        return {
          currency: typeof record['currency'] === 'string' ? record['currency'] : null,
          price:    pickNumber(quote, 'regularMarketPrice'),
          ter:      null,
        };
      } catch {
        return { currency: null, price: null, ter: null };
      }
    }
  }

  /**
   * Free-text symbol search — Yahoo accepts an ISIN, a ticker or a fund name
   * and returns scored candidates. Empty array on failure.
   */
  async searchSymbols(query: string): Promise<SymbolCandidate[]> {
    try {
      const response = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
      const quotes = Array.isArray(response?.quotes) ? response.quotes : [];
      const out: SymbolCandidate[] = [];
      for (const q of quotes) {
        const record = q as Record<string, unknown>;
        const symbol = typeof record['symbol'] === 'string' ? record['symbol'] : null;
        if (!symbol) continue;
        const name = (record['longname'] ?? record['shortname']) as string | undefined;
        out.push({
          symbol,
          name:     name ?? symbol,
          exchange: typeof record['exchDisp'] === 'string' ? record['exchDisp'] : '',
          type:     typeof record['quoteType'] === 'string' ? record['quoteType'] : '',
        });
      }
      return out;
    } catch (err) {
      this.logger.warn(`Yahoo Finance search failed for "${query}": ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Daily close history over the last `days` days, oldest first. Empty array
   * on lookup failure so the caller can choose to degrade gracefully.
   */
  async fetchHistorical(symbol: string, days: number, interval: '1d' | '1wk' = '1d'): Promise<HistoricalPoint[]> {
    try {
      const now = new Date();
      const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const chart = await yahooFinance.chart(symbol, {
        period1:  since,
        period2:  now,
        interval,
      });
      const quotes = Array.isArray(chart?.quotes) ? chart.quotes : [];
      const out: HistoricalPoint[] = [];
      for (const q of quotes) {
        const close = typeof q?.close === 'number' && Number.isFinite(q.close) ? q.close : null;
        const date  = q?.date instanceof Date ? q.date : null;
        if (close === null || date === null) continue;
        out.push({ date: date.toISOString().slice(0, 10), close });
      }
      return out;
    } catch (err) {
      this.logger.warn(`Yahoo Finance history failed for ${symbol}: ${(err as Error).message}`);
      return [];
    }
  }
}
