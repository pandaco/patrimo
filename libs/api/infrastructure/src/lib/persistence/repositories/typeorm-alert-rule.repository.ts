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

  async findById(id: string): Promise<AlertRule | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(seed: AlertRuleSeed): Promise<AlertRule> {
    const saved = await this.repo.save(this.repo.create(seed));
    return toDomain(saved);
  }

  async update(id: string, patch: Partial<AlertRuleSeed>): Promise<AlertRule | null> {
    await this.repo.update(id, patch);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return result.affected !== 0;
  }
}
