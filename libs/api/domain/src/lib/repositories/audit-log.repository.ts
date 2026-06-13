import { AuditLogEntry, AuditLogEntrySeed } from '../entities/audit-log.entity';

export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';

export interface AuditLogRepository {
  record(seed: AuditLogEntrySeed): Promise<void>;
  /** Newest first, capped at `limit`. */
  findByUserId(userId: string, limit: number): Promise<AuditLogEntry[]>;
}
