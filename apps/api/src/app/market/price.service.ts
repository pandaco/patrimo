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
    const hit = this.cache.get(symbol);
    if (hit) return hit;
    const fresh = await this.provider.fetch(symbol);
    this.cache.set(symbol, fresh);
    return fresh;
  }
}
