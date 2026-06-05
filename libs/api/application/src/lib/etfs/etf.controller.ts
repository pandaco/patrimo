import { Controller, Get, UseGuards } from '@nestjs/common';
import { EtfDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { EtfService } from './etf.service';

@Controller('etfs')
@UseGuards(SessionGuard)
export class EtfController {
  constructor(private readonly etfs: EtfService) {}

  @Get()
  list(): Promise<EtfDto[]> {
    return this.etfs.list();
  }
}
