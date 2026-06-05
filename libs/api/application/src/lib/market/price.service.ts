import { Injectable } from '@nestjs/common';
import { PriceCacheService, Quote } from './price-cache.service';
import { HistoricalPoint, YahooPriceProvider } from './yahoo-price.provider';
import { toYahooSymbol } from './yahoo-symbol';

@Injectable()
export class PriceService {
  constructor(
    private readonly cache:    PriceCacheService,
    private readonly provider: YahooPriceProvider,
  ) {}

  async getQuote(isin: string, ticker: string): Promise<Quote> {
    const symbol = toYahooSymbol(isin, ticker);
    const hit = await this.cache.getQuote(symbol);
    if (hit) return hit;
    return this.refresh(symbol);
  }

  /** Bypass the cache, fetch a fresh quote from Yahoo and overwrite the cached entry. */
  async refreshQuote(isin: string, ticker: string): Promise<Quote> {
    return this.refresh(toYahooSymbol(isin, ticker));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMetadata(isin: string, ticker: string): Promise<any> {
    const symbol = toYahooSymbol(isin, ticker);
    const key = `meta:${symbol}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hit = await this.cache.get<any>(key);
    if (hit) return hit;

    const fresh = await this.provider.fetchMetadata(symbol);
    if (fresh) await this.cache.set(key, fresh, 86400 * 7); // 1 week
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

  private async refresh(symbol: string): Promise<Quote> {
    const fresh = await this.provider.fetch(symbol);
    await this.cache.setQuote(symbol, fresh);
    return fresh;
  }
}
