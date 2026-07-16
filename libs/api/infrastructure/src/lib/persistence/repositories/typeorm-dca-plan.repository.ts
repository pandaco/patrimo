import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DcaPlan, DcaPlanRepository, DcaPlanSeed } from '@patrimo/api-domain';
import { LessThanOrEqual, Repository } from 'typeorm';
import { DcaPlanOrmEntity } from '../orm-entities/dca-plan.orm-entity';

function toDomain(row: DcaPlanOrmEntity): DcaPlan {
  return {
    id: row.id,
    userId: row.userId,
    envelopeId: row.envelopeId,
    amount: Number(row.amount),
    frequency: row.frequency,
    dayOfMonth: row.dayOfMonth,
    allocations: row.allocations,
    active: row.active,
    // TypeORM 'date' type returns string, need to convert
    nextExecution: new Date(row.nextExecution),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function computeNextExecution(dayOfMonth: number, fromDate = new Date()): Date {
  const d = new Date(fromDate);
  d.setDate(dayOfMonth);
  // If the target day has already passed this month, schedule for next month
  if (d.getTime() <= fromDate.getTime()) {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

@Injectable()
export class TypeOrmDcaPlanRepository implements DcaPlanRepository {
  constructor(
    @InjectRepository(DcaPlanOrmEntity)
    private readonly repo: Repository<DcaPlanOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<DcaPlan[]> {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
    return rows.map(toDomain);
  }

  async findActiveDueForExecution(beforeOrEqual: Date): Promise<DcaPlan[]> {
    const rows = await this.repo.find({
      where: { active: true, nextExecution: LessThanOrEqual(beforeOrEqual.toISOString().slice(0, 10) as unknown as Date) },
    });
    return rows.map(toDomain);
  }

  async create(seed: DcaPlanSeed): Promise<DcaPlan> {
    const nextExecution = computeNextExecution(seed.dayOfMonth);
    const saved = await this.repo.save(this.repo.create({ ...seed, nextExecution }));
    return toDomain(saved);
  }

  async updateForUser(
    id: string,
    userId: string,
    patch: Partial<DcaPlanSeed> & { nextExecution?: Date },
  ): Promise<DcaPlan | null> {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) return null;
    const updatePayload: Partial<DcaPlanOrmEntity> = { ...patch } as Partial<DcaPlanOrmEntity>;
    if (patch.dayOfMonth !== undefined && patch.nextExecution === undefined) {
      updatePayload.nextExecution = computeNextExecution(patch.dayOfMonth);
    }
    Object.assign(existing, updatePayload);
    const saved = await this.repo.save(existing);
    return toDomain(saved);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
