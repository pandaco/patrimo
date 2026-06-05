import { Controller, HttpCode, Param, Post, Get, UseGuards } from '@nestjs/common';
import { AlertDto } from '@patrimo/contracts';
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

  @Post('read-all')
  @HttpCode(204)
  readAll(@SessionUser() user: AuthUser): Promise<void> {
    return this.alerts.readAll(user.id);
  }

  @Post(':id/read')
  @HttpCode(204)
  markRead(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.alerts.markRead(user.id, id);
  }

  @Post(':id/dismiss')
  @HttpCode(204)
  dismiss(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.alerts.dismiss(user.id, id);
  }
}
