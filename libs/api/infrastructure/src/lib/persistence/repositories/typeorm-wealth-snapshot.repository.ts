import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { WealthSnapshot, WealthSnapshotRepository, WealthSnapshotSeed } from '@patrimo/api-domain';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { WealthSnapshotOrmEntity } from '../orm-entities/wealth-snapshot.orm-entity';

function toDomain(row: WealthSnapshotOrmEntity): WealthSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    total: row.total,
    byCategory: row.byCategory,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class TypeOrmWealthSnapshotRepository implements WealthSnapshotRepository {
  constructor(
    @InjectRepository(WealthSnapshotOrmEntity)
    private readonly repo: Repository<WealthSnapshotOrmEntity>,
  ) {}

  async findByUserId(userId: string, fromDate?: string): Promise<WealthSnapshot[]> {
    const rows = await this.repo.find({
      where: fromDate ? { userId, date: MoreThanOrEqual(fromDate) } : { userId },
      order: { date: 'ASC' },
    });
    return rows.map(toDomain);
  }

  async findLatestDate(userId: string): Promise<string | null> {
    const row = await this.repo.findOne({ where: { userId }, order: { date: 'DESC' } });
    return row?.date ?? null;
  }

  async upsertForDate(seed: WealthSnapshotSeed): Promise<void> {
    await this.repo.upsert(seed, ['userId', 'date']);
  }
}
