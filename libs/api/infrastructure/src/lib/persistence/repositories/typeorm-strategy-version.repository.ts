import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  StrategyVersion,
  StrategyVersionRepository,
  StrategyVersionSeed,
} from '@patrimo/api-domain';
import { Repository } from 'typeorm';
import { StrategyVersionOrmEntity } from '../orm-entities/strategy-version.orm-entity';

function toDomain(row: StrategyVersionOrmEntity): StrategyVersion {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    note: row.note,
    targets: row.targets,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class TypeOrmStrategyVersionRepository implements StrategyVersionRepository {
  constructor(
    @InjectRepository(StrategyVersionOrmEntity)
    private readonly repo: Repository<StrategyVersionOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<StrategyVersion[]> {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return rows.map(toDomain);
  }

  async create(seed: StrategyVersionSeed): Promise<StrategyVersion> {
    const saved = await this.repo.save(this.repo.create(seed));
    return toDomain(saved);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return result.affected !== 0;
  }
}
