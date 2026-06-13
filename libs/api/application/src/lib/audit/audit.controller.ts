import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditLogEntryDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
@UseGuards(SessionGuard)
export class AuditController {
  constructor(private readonly audit: AuditLogService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<AuditLogEntryDto[]> {
    return this.audit.list(user.id);
  }
}
