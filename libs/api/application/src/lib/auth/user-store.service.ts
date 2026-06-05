import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '@patrimo/api-domain';
import { AuthUser } from './types';

type UserSeed = Omit<AuthUser, 'id'>;

function toAuthUser(seed: UserSeed, id: string): AuthUser {
  return { ...seed, id };
}

@Injectable()
export class UserStoreService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async upsertFromGoogle(seed: UserSeed): Promise<AuthUser> {
    const saved = await this.users.upsertFromGoogle({
      googleId: seed.googleId,
      email: seed.email,
      name: seed.name,
      firstName: seed.firstName,
      lastName: seed.lastName,
      initials: seed.initials,
      picture: seed.picture ?? null,
    });
    return toAuthUser(
      {
        googleId: saved.googleId,
        email: saved.email,
        name: saved.name,
        firstName: saved.firstName,
        lastName: saved.lastName,
        initials: saved.initials,
        picture: saved.picture ?? undefined,
      },
      saved.id,
    );
  }

  async findById(id: string): Promise<AuthUser | undefined> {
    const user = await this.users.findById(id);
    if (!user) return undefined;
    return toAuthUser(
      {
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        initials: user.initials,
        picture: user.picture ?? undefined,
      },
      user.id,
    );
  }
}
