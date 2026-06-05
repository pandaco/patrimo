import { DcaPlan, DcaPlanSeed } from '../entities/dca-plan.entity';

export const DCA_PLAN_REPOSITORY = 'DCA_PLAN_REPOSITORY';

export interface DcaPlanRepository {
  findByUserId(userId: string): Promise<DcaPlan[]>;
  findById(id: string): Promise<DcaPlan | null>;
  findActiveDueForExecution(beforeOrEqual: Date): Promise<DcaPlan[]>;
  create(seed: DcaPlanSeed): Promise<DcaPlan>;
  update(id: string, patch: Partial<DcaPlanSeed> & { nextExecution?: Date }): Promise<DcaPlan | null>;
  delete(id: string): Promise<boolean>;
}
