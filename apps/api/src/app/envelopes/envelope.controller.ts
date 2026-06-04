import { Controller, Get, UseGuards } from '@nestjs/common';
import { EnvelopeDto } from 'contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { EnvelopeService } from './envelope.service';

@Controller('envelopes')
@UseGuards(SessionGuard)
export class EnvelopeController {
  constructor(private readonly envelopes: EnvelopeService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<EnvelopeDto[]> {
    return this.envelopes.listForUser(user.id);
  }
}
