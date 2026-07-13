import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { TauxChangeService } from './tauxChange.service';

@Controller('market')
@UseGuards(SessionGuard)
export class TauxChangeController {
  constructor(private readonly tauxChange: TauxChangeService) {}

  @Get('tauxChange-rates')
  rates(): Promise<Record<string, number>> {
    return this.tauxChange.getRates();
  }
}
