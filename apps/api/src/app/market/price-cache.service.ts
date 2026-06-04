import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface Quote {
  price:     number | null;
  prevClose: number | null;
}

const KEY_PREFIX = 'price:';
const DEFAULT_TTL_SECONDS = 15 * 60;

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
      const raw = await this.redis.get(KEY_PREFIX + symbol);
      return raw ? (JSON.parse(raw) as Quote) : null;
    } catch (err) {
      this.logger.warn(`Cache get failed for ${symbol}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(symbol: string, quote: Quote): Promise<void> {
    try {
      await this.redis.set(KEY_PREFIX + symbol, JSON.stringify(quote), 'EX', this.ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed for ${symbol}: ${(err as Error).message}`);
    }
  }

  async invalidate(symbol: string): Promise<void> {
    try {
      await this.redis.del(KEY_PREFIX + symbol);
    } catch (err) {
      this.logger.warn(`Cache invalidate failed for ${symbol}: ${(err as Error).message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
