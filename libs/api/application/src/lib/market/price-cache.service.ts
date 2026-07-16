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
  private readonly localCache = new Map<string, { valStr: string; expiresAt: number }>();

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

  private getLocal<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.localCache.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.valStr) as T;
    } catch {
      return null;
    }
  }

  private setLocal(key: string, value: unknown, ttlSeconds: number): void {
    this.localCache.set(key, {
      valStr: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis.status !== 'ready') {
      return this.getLocal<T>(key);
    }
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`Redis get failed for ${key}, falling back to local: ${(err as Error).message}`);
      return this.getLocal<T>(key);
    }
  }

  async set(key: string, value: unknown, ttlSeconds = this.ttlSeconds): Promise<void> {
    this.setLocal(key, value, ttlSeconds);
    if (this.redis.status !== 'ready') return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Redis set failed for ${key}: ${(err as Error).message}`);
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    return this.get<Quote>(QUOTE_PREFIX + symbol);
  }

  async setQuote(symbol: string, quote: Quote): Promise<void> {
    return this.set(QUOTE_PREFIX + symbol, quote);
  }

  async invalidate(symbol: string): Promise<void> {
    const key = QUOTE_PREFIX + symbol;
    this.localCache.delete(key);
    if (this.redis.status !== 'ready') return;
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn(`Redis delete failed for ${symbol}: ${(err as Error).message}`);
    }
  }

  async getHistory(symbol: string, days: number, interval = '1d'): Promise<HistoricalPoint[] | null> {
    return this.get<HistoricalPoint[]>(`${HISTORY_PREFIX}${symbol}:${days}:${interval}`);
  }

  async setHistory(symbol: string, days: number, points: HistoricalPoint[], interval = '1d'): Promise<void> {
    return this.set(`${HISTORY_PREFIX}${symbol}:${days}:${interval}`, points, HISTORY_TTL_SECONDS);
  }

  async getRaw(key: string): Promise<string | null> {
    if (this.redis.status !== 'ready') {
      const entry = this.localCache.get(key);
      return (entry && Date.now() <= entry.expiresAt) ? entry.valStr : null;
    }
    try { 
      return await this.redis.get(key); 
    } catch { 
      const entry = this.localCache.get(key);
      return (entry && Date.now() <= entry.expiresAt) ? entry.valStr : null;
    }
  }

  async setRaw(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.localCache.set(key, { valStr: value, expiresAt: Date.now() + ttlSeconds * 1000 });
    if (this.redis.status !== 'ready') return;
    try { 
      await this.redis.set(key, value, 'EX', ttlSeconds); 
    } catch { /* ignore */ }
  }

  async clearPrefix(prefix: string): Promise<void> {
    for (const key of this.localCache.keys()) {
      if (key.startsWith(prefix)) this.localCache.delete(key);
    }
    if (this.redis.status !== 'ready') return;
    try {
      const keys = await this.redis.keys(prefix + '*');
      if (keys.length > 0) await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(`Redis keys/del failed for prefix ${prefix}: ${(err as Error).message}`);
    }
  }

  async clearAll(): Promise<void> {
    this.localCache.clear();
    if (this.redis.status !== 'ready') return;
    try {
      await this.clearPrefix('price:');
      await this.clearPrefix('history:');
      await this.clearPrefix('meta:');
      await this.clearPrefix('justetf:');
      await this.clearPrefix('justetf-meta:');
    } catch (err) {
      this.logger.warn(`Redis clearAll failed: ${(err as Error).message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
