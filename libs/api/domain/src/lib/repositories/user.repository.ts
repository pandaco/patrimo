import { User, UserSeed } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  /** Every registered user — used by daily crons (snapshots) to sweep all accounts. */
  findAll(): Promise<User[]>;
  upsertFromGoogle(seed: UserSeed): Promise<User>;
}
