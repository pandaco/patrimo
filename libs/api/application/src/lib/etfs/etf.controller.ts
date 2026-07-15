import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EtfDto, EtfLookupResultDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { CreateEtfDtoBody } from './dto/create-etf.dto';
import { LookupEtfQueryDto } from './dto/lookup-etf.dto';
import { UpdateEtfDtoBody } from './dto/update-etf.dto';
import { EtfService } from './etf.service';

@Controller('etfs')
@UseGuards(SessionGuard)
export class EtfController {
  constructor(private readonly etfs: EtfService) {}

  @Get()
  list(): Promise<EtfDto[]> {
    return this.etfs.list();
  }

  @Get('lookup')
  lookup(@Query() { query }: LookupEtfQueryDto): Promise<EtfLookupResultDto[]> {
    return this.etfs.lookup(query);
  }

  @Get('metadata/:isin')
  metadata(@Param('isin') isin: string) {
    return this.etfs.metadata(isin);
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

  @Patch(':isin')
  async update(
    @Param('isin') isin: string,
    @Body() body: UpdateEtfDtoBody,
  ): Promise<EtfDto> {
    return this.etfs.update(isin, body);
  }
}
