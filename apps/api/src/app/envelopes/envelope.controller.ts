import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { EnvelopeDto } from 'contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { CreateEnvelopeDtoBody } from './dto/create-envelope.dto';
import { EnvelopeService } from './envelope.service';

@Controller('envelopes')
@UseGuards(SessionGuard)
export class EnvelopeController {
  constructor(private readonly envelopes: EnvelopeService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<EnvelopeDto[]> {
    return this.envelopes.listForUser(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @SessionUser() user: AuthUser,
    @Body() body: CreateEnvelopeDtoBody,
  ): Promise<EnvelopeDto> {
    return this.envelopes.create(user.id, body);
  }
}
