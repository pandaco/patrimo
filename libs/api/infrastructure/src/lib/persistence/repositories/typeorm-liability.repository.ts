import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Liability, LiabilityRepository, LiabilitySeed } from '@patrimo/api-domain';
import { Repository } from 'typeorm';
import { LiabilityOrmEntity } from '../orm-entities/liability.orm-entity';

// pg returns `date` columns as `YYYY-MM-DD` strings; coerce to Date so the
// domain entity stays honest about its type signature.
function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDomain(row: LiabilityOrmEntity): Liability {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    kind: row.kind as Liability['kind'],
    initialAmount: row.initialAmount,
    currentBalance: row.currentBalance,
    ratePct: row.ratePct,
    monthlyPayment: row.monthlyPayment,
    startDate: toDate(row.startDate),
    endDate: row.endDate ? toDate(row.endDate) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class TypeOrmLiabilityRepository implements LiabilityRepository {
  constructor(
    @InjectRepository(LiabilityOrmEntity)
    private readonly repo: Repository<LiabilityOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<Liability[]> {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
    return rows.map(toDomain);
  }

  async create(seed: LiabilitySeed): Promise<Liability> {
    const entity: LiabilityOrmEntity = this.repo.create(seed as Partial<LiabilityOrmEntity>);
    const saved: LiabilityOrmEntity  = await this.repo.save(entity);
    return toDomain(saved);
  }

  async updateForUser(
    id: string,
    userId: string,
    patch: Partial<LiabilitySeed>,
  ): Promise<Liability | null> {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) return null;
    Object.assign(existing, patch as Partial<LiabilityOrmEntity>);
    const saved: LiabilityOrmEntity = await this.repo.save(existing);
    return toDomain(saved);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
