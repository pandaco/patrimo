import { Injectable } from '@nestjs/common';
import { PriceCacheService } from './price-cache.service';

const FX_CACHE_KEY = 'fx:eur:rates';
const FX_TTL_SECONDS = 6 * 3600;

@Injectable()
export class FxService {
  constructor(private readonly cache: PriceCacheService) {}

  async getRates(): Promise<Record<string, number>> {
    const cached = await this.cache.getRaw(FX_CACHE_KEY);
    if (cached) return JSON.parse(cached) as Record<string, number>;

    try {
      const res  = await fetch('https://api.frankfurter.app/latest?from=EUR');
      const data = await res.json() as { rates: Record<string, number> };
      const rates: Record<string, number> = { EUR: 1, ...data.rates };
      await this.cache.setRaw(FX_CACHE_KEY, JSON.stringify(rates), FX_TTL_SECONDS);
      return rates;
    } catch {
      return { EUR: 1 };
    }
  }
}
