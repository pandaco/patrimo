import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogEntry,
  AuditLogEntrySeed,
  AuditLogRepository,
} from '@patrimo/api-domain';
import { AuditLogEntryDto } from '@patrimo/contracts';

const DEFAULT_LIMIT = 50;

function toDto(entry: AuditLogEntry): AuditLogEntryDto {
  return {
    id: entry.id,
    method: entry.method,
    resource: entry.resource,
    action: entry.action,
    entityId: entry.entityId,
    statusCode: entry.statusCode,
    createdAt: entry.createdAt.toISOString(),
  };
}

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly repo: AuditLogRepository,
  ) {}

  record(seed: AuditLogEntrySeed): Promise<void> {
    return this.repo.record(seed);
  }

  async list(userId: string, limit = DEFAULT_LIMIT): Promise<AuditLogEntryDto[]> {
    const entries = await this.repo.findByUserId(userId, limit);
    return entries.map(toDto);
  }
}
