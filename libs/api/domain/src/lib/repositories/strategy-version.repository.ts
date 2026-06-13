import { StrategyVersion, StrategyVersionSeed } from '../entities/strategy-version.entity';

export const STRATEGY_VERSION_REPOSITORY = 'STRATEGY_VERSION_REPOSITORY';

export interface StrategyVersionRepository {
  /** Newest first. */
  findByUserId(userId: string): Promise<StrategyVersion[]>;
  create(seed: StrategyVersionSeed): Promise<StrategyVersion>;
  /** Returns false when the id does not exist or belongs to another user. */
  delete(id: string, userId: string): Promise<boolean>;
}
