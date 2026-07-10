import { Inject, Injectable } from '@nestjs/common';
import type { Liability, LiabilityRepository, LiabilitySeed } from '@patrimo/api-domain';
import { CreateLiabilityDto, LiabilityDto, UpdateLiabilityDto } from '@patrimo/contracts';
import { LIABILITY_REPOSITORY } from '@patrimo/infrastructure';

function toDto(liability: Liability): LiabilityDto {
  return {
    id: liability.id,
    label: liability.label,
    kind: liability.kind,
    initialAmount: liability.initialAmount,
    currentBalance: liability.currentBalance,
    ratePct: liability.ratePct,
    monthlyPayment: liability.monthlyPayment,
    startDate: liability.startDate.toISOString().slice(0, 10),
    endDate: liability.endDate ? liability.endDate.toISOString().slice(0, 10) : null,
  };
}

function toPatch(input: UpdateLiabilityDto): Partial<LiabilitySeed> {
  const patch: Partial<LiabilitySeed> = {};
  if (input.label          !== undefined) patch.label          = input.label;
  if (input.kind           !== undefined) patch.kind           = input.kind;
  if (input.initialAmount  !== undefined) patch.initialAmount  = input.initialAmount;
  if (input.currentBalance !== undefined) patch.currentBalance = input.currentBalance;
  if (input.ratePct        !== undefined) patch.ratePct        = input.ratePct;
  if (input.monthlyPayment !== undefined) patch.monthlyPayment = input.monthlyPayment;
  if (input.startDate      !== undefined) patch.startDate      = new Date(input.startDate);
  if (input.endDate        !== undefined) patch.endDate        = input.endDate ? new Date(input.endDate) : null;
  return patch;
}

@Injectable()
export class LiabilityService {
  constructor(
    @Inject(LIABILITY_REPOSITORY) private readonly liabilities: LiabilityRepository,
  ) {}

  async listForUser(userId: string): Promise<LiabilityDto[]> {
    const rows = await this.liabilities.findByUserId(userId);
    return rows.map(toDto);
  }

  async create(userId: string, input: CreateLiabilityDto): Promise<LiabilityDto> {
    const created = await this.liabilities.create({
      userId,
      label: input.label,
      kind: input.kind,
      initialAmount: input.initialAmount,
      currentBalance: input.currentBalance,
      ratePct: input.ratePct,
      monthlyPayment: input.monthlyPayment,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
    });
    return toDto(created);
  }

  async update(id: string, userId: string, input: UpdateLiabilityDto): Promise<LiabilityDto | null> {
    const updated = await this.liabilities.updateForUser(id, userId, toPatch(input));
    return updated ? toDto(updated) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return this.liabilities.deleteForUser(id, userId);
  }
}
