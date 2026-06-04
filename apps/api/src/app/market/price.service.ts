import { Injectable } from '@nestjs/common';
import { PriceCacheService, Quote } from './price-cache.service';
import { YahooPriceProvider } from './yahoo-price.provider';
import { toYahooSymbol } from './yahoo-symbol';

@Injectable()
export class PriceService {
  constructor(
    private readonly cache:    PriceCacheService,
    private readonly provider: YahooPriceProvider,
  ) {}

  async getQuote(isin: string, ticker: string): Promise<Quote> {
    const symbol = toYahooSymbol(isin, ticker);
    const hit = await this.cache.get(symbol);
    if (hit) return hit;
    return this.refresh(symbol);
  }

  /** Bypass the cache, fetch a fresh quote from Yahoo and overwrite the cached entry. */
  async refreshQuote(isin: string, ticker: string): Promise<Quote> {
    return this.refresh(toYahooSymbol(isin, ticker));
  }

  private async refresh(symbol: string): Promise<Quote> {
    const fresh = await this.provider.fetch(symbol);
    await this.cache.set(symbol, fresh);
    return fresh;
  }
}
