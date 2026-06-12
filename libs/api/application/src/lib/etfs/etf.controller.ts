import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { EtfDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SetWatchOnlyDtoBody } from './dto/set-watch-only.dto';
import { EtfService } from './etf.service';

@Controller('etfs')
@UseGuards(SessionGuard)
export class EtfController {
  constructor(private readonly etfs: EtfService) {}

  @Get()
  list(): Promise<EtfDto[]> {
    return this.etfs.list();
  }

  @Patch(':isin/watch')
  async setWatchOnly(
    @Param('isin') isin: string,
    @Body() body: SetWatchOnlyDtoBody,
  ): Promise<EtfDto> {
    const updated = await this.etfs.setWatchOnly(isin, body.watchOnly);
    if (!updated) throw new NotFoundException(`Unknown ETF: ${isin}`);
    return updated;
  }
}
