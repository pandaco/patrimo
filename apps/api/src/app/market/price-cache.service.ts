import { Injectable, OnApplicationShutdown } from '@nestjs/common';

export interface Quote {
  price:     number | null;
  prevClose: number | null;
}

interface CacheEntry extends Quote {
  expiresAt: number;
}

const DEFAULT_TTL_MS    = 15 * 60 * 1000;
const SWEEP_INTERVAL_MS = 30 * 60 * 1000;

@Injectable()
export class PriceCacheService implements OnApplicationShutdown {
  private readonly store   = new Map<string, CacheEntry>();
  private readonly ttlMs   = DEFAULT_TTL_MS;
  private readonly sweeper: NodeJS.Timeout;

  constructor() {
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    this.sweeper.unref?.();
  }

  get(symbol: string): Quote | null {
    const entry = this.store.get(symbol);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(symbol);
      return null;
    }
    return { price: entry.price, prevClose: entry.prevClose };
  }

  set(symbol: string, quote: Quote): void {
    this.store.set(symbol, { ...quote, expiresAt: Date.now() + this.ttlMs });
  }

  onApplicationShutdown(): void {
    clearInterval(this.sweeper);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [symbol, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(symbol);
    }
  }
}
