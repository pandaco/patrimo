import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [AuditController],
  providers: [
    AuditLogService,
    // Registered globally — APP_INTERCEPTOR providers apply app-wide even when
    // declared in a feature module.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AuditModule {}
