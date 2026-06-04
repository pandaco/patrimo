import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser } from './types';

type UserSeed = Omit<AuthUser, 'id'>;

@Injectable()
export class UserStoreService {
  private readonly byGoogleId = new Map<string, AuthUser>();

  upsertFromGoogle(seed: UserSeed): AuthUser {
    const existing = this.byGoogleId.get(seed.googleId);
    if (existing) {
      const updated: AuthUser = { ...existing, ...seed, id: existing.id };
      this.byGoogleId.set(seed.googleId, updated);
      return updated;
    }
    const created: AuthUser = { ...seed, id: randomUUID() };
    this.byGoogleId.set(seed.googleId, created);
    return created;
  }

  findById(id: string): AuthUser | undefined {
    for (const user of this.byGoogleId.values()) {
      if (user.id === id) return user;
    }
    return undefined;
  }
}
