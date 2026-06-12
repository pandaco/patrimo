import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EtfDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { CreateEtfDtoBody } from './dto/create-etf.dto';
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

  @Post()
  create(@Body() body: CreateEtfDtoBody): Promise<EtfDto> {
    return this.etfs.create(body);
  }

  @Delete(':isin')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @SessionUser() user: AuthUser,
    @Param('isin') isin: string,
  ): Promise<void> {
    return this.etfs.delete(user.id, isin);
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
