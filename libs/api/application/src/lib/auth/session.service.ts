import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

interface Session {
  userId: string;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessions = new Map<string, Session>();
  private readonly ttlMs: number;
  private readonly sweeper: NodeJS.Timeout;

  constructor(config: ConfigService) {
    this.ttlMs = config.get<number>('SESSION_TTL_MS', DEFAULT_TTL_MS);
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    this.sweeper.unref?.();
  }

  create(userId: string): string {
    const id = randomBytes(32).toString('base64url');
    this.sessions.set(id, { userId, expiresAt: Date.now() + this.ttlMs });
    return id;
  }

  get(id: string): Session | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }

  destroy(id: string): void {
    this.sessions.delete(id);
  }

  onApplicationShutdown(): void {
    clearInterval(this.sweeper);
  }

  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
        removed++;
      }
    }
    if (removed > 0) this.logger.debug(`Swept ${removed} expired sessions`);
  }
}
