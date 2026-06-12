import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomBytes } from 'node:crypto';

interface Session {
  userId: string;
  expiresAt: number;
}

const KEY_PREFIX = 'session:';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Redis-backed session store with a local in-memory mirror as fallback.
 *
 * - Sessions survive API restarts and are shareable across replicas.
 * - Sliding window: every authenticated hit refreshes the TTL, so a session
 *   only dies after `SESSION_TTL_MS` of *inactivity* (security-audit P3).
 * - When Redis is down, reads and writes degrade to the local Map exactly
 *   like `PriceCacheService` does — a restart during an outage logs everyone
 *   out, which is the pre-Redis behaviour, never worse.
 */
@Injectable()
export class SessionService implements OnApplicationShutdown {
  private readonly logger = new Logger(SessionService.name);
  private readonly local = new Map<string, Session>();
  private readonly redis: Redis;
  private readonly ttlMs: number;
  private readonly sweeper: NodeJS.Timeout;

  constructor(config: ConfigService) {
    this.ttlMs = config.get<number>('SESSION_TTL_MS', DEFAULT_TTL_MS);
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.redis.on('error', (err) => this.logger.warn(`Redis client error: ${err.message}`));
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    this.sweeper.unref?.();
  }

  async create(userId: string): Promise<string> {
    const id = randomBytes(32).toString('base64url');
    const session: Session = { userId, expiresAt: Date.now() + this.ttlMs };
    this.local.set(id, session);
    if (this.redis.status === 'ready') {
      try {
        await this.redis.set(KEY_PREFIX + id, JSON.stringify({ userId }), 'PX', this.ttlMs);
      } catch (err) {
        this.logger.warn(`Redis session write failed: ${(err as Error).message}`);
      }
    }
    return id;
  }

  async get(id: string): Promise<Session | null> {
    if (this.redis.status === 'ready') {
      try {
        const raw = await this.redis.get(KEY_PREFIX + id);
        if (!raw) {
          this.local.delete(id);
          return null;
        }
        const { userId } = JSON.parse(raw) as { userId: string };
        // Sliding window: any authenticated hit pushes the expiry back.
        await this.redis.pexpire(KEY_PREFIX + id, this.ttlMs).catch(() => undefined);
        const session: Session = { userId, expiresAt: Date.now() + this.ttlMs };
        this.local.set(id, session);
        return session;
      } catch (err) {
        this.logger.warn(`Redis session read failed, falling back to local: ${(err as Error).message}`);
      }
    }
    const session = this.local.get(id);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.local.delete(id);
      return null;
    }
    session.expiresAt = Date.now() + this.ttlMs;
    return session;
  }

  async destroy(id: string): Promise<void> {
    this.local.delete(id);
    if (this.redis.status !== 'ready') return;
    try {
      await this.redis.del(KEY_PREFIX + id);
    } catch (err) {
      this.logger.warn(`Redis session delete failed: ${(err as Error).message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    clearInterval(this.sweeper);
    await this.redis.quit().catch(() => undefined);
  }

  /** The local mirror has no native TTL — sweep it hourly like before. */
  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [id, session] of this.local) {
      if (session.expiresAt <= now) {
        this.local.delete(id);
        removed++;
      }
    }
    if (removed > 0) this.logger.debug(`Swept ${removed} expired local sessions`);
  }
}
