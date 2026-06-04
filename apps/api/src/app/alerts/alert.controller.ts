import { Controller, Get, UseGuards } from '@nestjs/common';
import { AlertDto } from 'contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { AlertService } from './alert.service';

@Controller('alerts')
@UseGuards(SessionGuard)
export class AlertController {
  constructor(private readonly alerts: AlertService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<AlertDto[]> {
    return this.alerts.listForUser(user.id);
  }
}
