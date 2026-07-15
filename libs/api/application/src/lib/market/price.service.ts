import { Injectable } from '@nestjs/common';
import { PriceCacheService, Quote } from './price-cache.service';
import { HistoricalPoint, SymbolCandidate, YahooPriceProvider } from './yahoo-price.provider';
import { toYahooSymbol } from './yahoo-symbol';

import { JustEtfProvider } from './justetf.provider';

export interface SymbolSearchResult extends SymbolCandidate {
  currency: string | null;
  price:    number | null;
  /** Expense ratio in percent when Yahoo discloses it (mostly US-listed funds). */
  ter:      number | null;
}

@Injectable()
export class PriceService {
  constructor(
    private readonly cache:    PriceCacheService,
    private readonly provider: YahooPriceProvider,
    private readonly justEtf:  JustEtfProvider,
  ) {}

  async getQuote(isin: string, ticker: string): Promise<Quote> {
    const symbol = toYahooSymbol(isin, ticker);
    const hit   = await this.cache.getQuote(symbol);
    const quote = hit ?? await this.refresh(symbol);
    if (quote.price !== null) return quote;

    // Live quote unavailable (Yahoo unreachable, after-hours, illiquid line).
    // Fall back to the most recent historical close — which is cached 24 h and
    // survives a quote outage — so position value and PnL don't silently
    // collapse to zero (value == cost → "plus-value latente" stuck at 0).
    const history = await this.getHistorical(isin, ticker, 7);
    if (history.length > 0) {
      const lastClose = history[history.length - 1].close;
      const prevClose = history.length > 1 ? history[history.length - 2].close : quote.prevClose;
      return { price: lastClose, prevClose };
    }
    return quote;
  }

  /** Bypass the cache, fetch a fresh quote from Yahoo and overwrite the cached entry. */
  async refreshQuote(isin: string, ticker: string): Promise<Quote> {
    return this.refresh(toYahooSymbol(isin, ticker));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMetadata(isin: string, ticker: string): Promise<any> {
    const symbol = toYahooSymbol(isin, ticker);
    const key = `meta:v2:${symbol}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hit = await this.cache.get<any>(key);
    if (hit) return hit;

    const fresh = await this.provider.fetchMetadata(symbol);
    if (fresh) await this.cache.set(key, fresh, 86400 * 7); // 1 week
    return fresh;
  }

  async getEtfExposure(isin: string): Promise<{ geography: Record<string, number>; sector: Record<string, number> }> {
    const key = `justetf:${isin}`;
    const cached = await this.cache.get<{ geography: Record<string, number>; sector: Record<string, number> }>(key);
    if (cached) return cached;

    const fresh = await this.justEtf.fetchExposure(isin);
    // Cache for 7 days
    await this.cache.set(key, fresh, 7 * 24 * 60 * 60);
    return fresh;
  }

  async getEtfMetadata(isin: string) {
    const key = `justetf-meta:${isin}`;
    const cached = await this.cache.get<any>(key);
    if (cached) return cached;

    const fresh = await this.justEtf.fetchMetadata(isin);
    // Cache for 7 days
    await this.cache.set(key, fresh, 7 * 24 * 60 * 60);
    return fresh;
  }

  /** Close history for the last `days` days. Cached in Redis 24 h. */
  async getHistorical(isin: string, ticker: string, days: number, interval: '1d' | '1wk' = '1d'): Promise<HistoricalPoint[]> {
    const symbol = toYahooSymbol(isin, ticker);
    const hit = await this.cache.getHistory(symbol, days, interval);
    if (hit) return hit;
    const fresh = await this.provider.fetchHistorical(symbol, days, interval);
    if (fresh.length > 0) await this.cache.setHistory(symbol, days, fresh, interval);
    return fresh;
  }

  /**
   * Free-text search (ISIN, ticker or name) for the add-ETF flow. ETFs are
   * ranked first, the top candidates are enriched with currency + last price
   * via parallel quotes. Uncached — this is a punctual, user-driven lookup.
   */
  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    const candidates = await this.provider.searchSymbols(query);
    const isFrenchIsin = /^FR[A-Z0-9]{10}$/i.test(query.trim());
    const ranked = [...candidates]
      .sort((a, b) => {
        const aFund = a.type === 'ETF' || a.type === 'FUND' ? 1 : 0;
        const bFund = b.type === 'ETF' || b.type === 'FUND' ? 1 : 0;
        if (bFund !== aFund) return bFund - aFund;
        if (isFrenchIsin) {
          const aPa = a.symbol.endsWith('.PA') ? 1 : 0;
          const bPa = b.symbol.endsWith('.PA') ? 1 : 0;
          return bPa - aPa;
        }
        return 0;
      })
      .slice(0, 8);

    return Promise.all(
      ranked.map(async candidate => ({
        ...candidate,
        ...(await this.provider.fetchSearchDetail(candidate.symbol)),
      })),
    );
  }

  private async refresh(symbol: string): Promise<Quote> {
    const fresh = await this.provider.fetch(symbol);
    await this.cache.setQuote(symbol, fresh);
    return fresh;
  }
}
