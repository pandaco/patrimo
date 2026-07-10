import { Liability, LiabilitySeed } from '../entities/liability.entity';

export const LIABILITY_REPOSITORY = 'LIABILITY_REPOSITORY';

export interface LiabilityRepository {
  findByUserId(userId: string): Promise<Liability[]>;
  create(seed: LiabilitySeed): Promise<Liability>;
  /** Apply `patch` to the liability iff it belongs to `userId`. */
  updateForUser(
    id: string,
    userId: string,
    patch: Partial<LiabilitySeed>,
  ): Promise<Liability | null>;
  /** Delete the liability iff it belongs to `userId`. */
  deleteForUser(id: string, userId: string): Promise<boolean>;
}
