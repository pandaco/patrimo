import { DcaPlan, DcaPlanSeed } from '../entities/dca-plan.entity';

export const DCA_PLAN_REPOSITORY = 'DCA_PLAN_REPOSITORY';

export interface DcaPlanRepository {
  findByUserId(userId: string): Promise<DcaPlan[]>;
  findActiveDueForExecution(beforeOrEqual: Date): Promise<DcaPlan[]>;
  create(seed: DcaPlanSeed): Promise<DcaPlan>;
  /** Apply `patch` to the plan iff it belongs to `userId`. Recomputes nextExecution when dayOfMonth changes. */
  updateForUser(
    id: string,
    userId: string,
    patch: Partial<DcaPlanSeed> & { nextExecution?: Date },
  ): Promise<DcaPlan | null>;
  /** Delete the plan iff it belongs to `userId`. */
  deleteForUser(id: string, userId: string): Promise<boolean>;
}
