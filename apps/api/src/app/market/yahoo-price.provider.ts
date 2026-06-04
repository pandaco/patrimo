import { Injectable, Logger } from '@nestjs/common';
import yahooFinance from 'yahoo-finance2';
import { Quote } from './price-cache.service';

function pickNumber(record: unknown, key: string): number | null {
  if (typeof record !== 'object' || record === null) return null;
  const value = (record as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
}
