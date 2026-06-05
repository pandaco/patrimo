import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AlertDto, AlertRuleDto, CreateAlertRuleDto, UpdateAlertRuleDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { AlertRuleService } from './alert-rule.service';
import { AlertService } from './alert.service';

@Controller('alerts')
@UseGuards(SessionGuard)
export class AlertController {
  constructor(
    private readonly alerts: AlertService,
    private readonly rules:  AlertRuleService,
  ) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<AlertDto[]> {
    return this.alerts.listForUser(user.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  readAll(@SessionUser() user: AuthUser): Promise<void> {
    return this.alerts.readAll(user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  read(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.alerts.markRead(user.id, id);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  dismiss(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.alerts.dismiss(user.id, id);
  }

  // --- Rules ---

  @Get('rules')
  listRules(@SessionUser() user: AuthUser): Promise<AlertRuleDto[]> {
    return this.rules.list(user.id);
  }

  @Post('rules')
  createRule(
    @SessionUser() user: AuthUser,
    @Body() body: CreateAlertRuleDto,
  ): Promise<AlertRuleDto> {
    return this.rules.create(user.id, body);
  }

  @Patch('rules/:id')
  async updateRule(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateAlertRuleDto,
  ): Promise<AlertRuleDto> {
    const updated = await this.rules.update(id, user.id, body);
    if (!updated) throw new NotFoundException('Rule not found');
    return updated;
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    const deleted = await this.rules.delete(id, user.id);
    if (!deleted) throw new NotFoundException('Rule not found');
  }
}
