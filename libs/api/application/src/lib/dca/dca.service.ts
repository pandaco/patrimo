import { Inject, Injectable } from '@nestjs/common';
import { DCA_PLAN_REPOSITORY, DcaPlan, DcaPlanRepository } from '@patrimo/api-domain';
import { CreateDcaPlanDto, DcaPlanDto, UpdateDcaPlanDto } from '@patrimo/contracts';

function toDto(plan: DcaPlan): DcaPlanDto {
  return {
    id: plan.id,
    envelopeId: plan.envelopeId,
    amount: plan.amount,
    frequency: plan.frequency,
    dayOfMonth: plan.dayOfMonth,
    allocations: plan.allocations,
    active: plan.active,
    nextExecution: plan.nextExecution.toISOString().slice(0, 10),
  };
}

@Injectable()
export class DcaService {
  constructor(
    @Inject(DCA_PLAN_REPOSITORY)
    private readonly repo: DcaPlanRepository,
  ) {}

  async list(userId: string): Promise<DcaPlanDto[]> {
    const plans = await this.repo.findByUserId(userId);
    return plans.map(toDto);
  }

  async create(userId: string, input: CreateDcaPlanDto): Promise<DcaPlanDto> {
    const created = await this.repo.create({
      userId,
      envelopeId: input.envelopeId,
      amount: input.amount,
      frequency: input.frequency,
      dayOfMonth: input.dayOfMonth,
      allocations: input.allocations,
      active: true,
    });
    return toDto(created);
  }

  async update(id: string, userId: string, input: UpdateDcaPlanDto): Promise<DcaPlanDto | null> {
    const updated = await this.repo.updateForUser(id, userId, input);
    return updated ? toDto(updated) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return this.repo.deleteForUser(id, userId);
  }
}
