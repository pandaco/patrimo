import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AuditLogEntry,
  AuditLogEntrySeed,
  AuditLogRepository,
} from '@patrimo/api-domain';
import { Repository } from 'typeorm';
import { AuditLogOrmEntity } from '../orm-entities/audit-log.orm-entity';

function toDomain(row: AuditLogOrmEntity): AuditLogEntry {
  return {
    id: row.id,
    userId: row.userId,
    method: row.method,
    resource: row.resource,
    action: row.action,
    entityId: row.entityId,
    statusCode: row.statusCode,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class TypeOrmAuditLogRepository implements AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogOrmEntity)
    private readonly repo: Repository<AuditLogOrmEntity>,
  ) {}

  async record(seed: AuditLogEntrySeed): Promise<void> {
    await this.repo.save(this.repo.create(seed));
  }

  async findByUserId(userId: string, limit: number): Promise<AuditLogEntry[]> {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map(toDomain);
  }
}
