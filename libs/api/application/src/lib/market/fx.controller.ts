import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { FxService } from './fx.service';

@Controller('market')
@UseGuards(SessionGuard)
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get('fx-rates')
  rates(): Promise<Record<string, number>> {
    return this.fx.getRates();
  }
}
