import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { HistoricalPoint } from './yahoo-price.provider';

export interface Quote {
  price:     number | null;
  prevClose: number | null;
}

const QUOTE_PREFIX   = 'price:';
const HISTORY_PREFIX = 'history:';
const DEFAULT_TTL_SECONDS = 15 * 60;
const HISTORY_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class PriceCacheService implements OnApplicationShutdown {
  private readonly logger = new Logger(PriceCacheService.name);
  private readonly redis: Redis;
  private readonly ttlSeconds: number;

  constructor(config: ConfigService) {
    this.ttlSeconds = config.get<number>('PRICE_CACHE_TTL_SECONDS', DEFAULT_TTL_SECONDS);
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      // Keep retries bounded so a transient Redis outage does not pile up
      // forever-pending price lookups in the request queue.
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.redis.on('error', err => this.logger.warn(`Redis client error: ${err.message}`));
  }

  async get(symbol: string): Promise<Quote | null> {
    try {
      const raw = await this.redis.get(QUOTE_PREFIX + symbol);
      return raw ? (JSON.parse(raw) as Quote) : null;
    } catch (err) {
      this.logger.warn(`Cache get failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(symbol: string, quote: Quote): Promise<void> {
    try {
      await this.redis.set(QUOTE_PREFIX + symbol, JSON.stringify(quote), 'EX', this.ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed for ${symbol}: ${(err as Error).message}`);
    }
  }

  async invalidate(symbol: string): Promise<void> {
    try {
      await this.redis.del(QUOTE_PREFIX + symbol);
    } catch (err) {
      this.logger.warn(`Cache invalidate failed for ${symbol}: ${(err as Error).message}`);
    }
  }

  async getHistory(symbol: string, days: number): Promise<HistoricalPoint[] | null> {
    try {
      const raw = await this.redis.get(`${HISTORY_PREFIX}${symbol}:${days}`);
      return raw ? (JSON.parse(raw) as HistoricalPoint[]) : null;
    } catch (err) {
      this.logger.warn(`History cache get failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async setHistory(symbol: string, days: number, points: HistoricalPoint[]): Promise<void> {
    try {
      await this.redis.set(
        `${HISTORY_PREFIX}${symbol}:${days}`,
        JSON.stringify(points),
        'EX',
        HISTORY_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`History cache set failed for ${symbol}: ${(err as Error).message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
