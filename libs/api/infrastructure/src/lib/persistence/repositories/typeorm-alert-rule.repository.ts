import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AlertRule, AlertRuleRepository, AlertRuleSeed } from '@patrimo/api-domain';
import { Repository } from 'typeorm';
import { AlertRuleOrmEntity } from '../orm-entities/alert-rule.orm-entity';

function toDomain(row: AlertRuleOrmEntity): AlertRule {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    threshold: Number(row.threshold),
    channels: row.channels,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class TypeOrmAlertRuleRepository implements AlertRuleRepository {
  constructor(
    @InjectRepository(AlertRuleOrmEntity)
    private readonly repo: Repository<AlertRuleOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<AlertRule[]> {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
    return rows.map(toDomain);
  }

  async create(seed: AlertRuleSeed): Promise<AlertRule> {
    const saved = await this.repo.save(this.repo.create(seed));
    return toDomain(saved);
  }

  async updateForUser(
    id: string,
    userId: string,
    patch: Partial<AlertRuleSeed>,
  ): Promise<AlertRule | null> {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) return null;
    Object.assign(existing, patch);
    const saved = await this.repo.save(existing);
    return toDomain(saved);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
