import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EnvelopeDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { CreateEnvelopeDtoBody } from './dto/create-envelope.dto';
import { UpdateEnvelopeDtoBody } from './dto/update-envelope.dto';
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

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @SessionUser() user: AuthUser,
    @Body() body: UpdateEnvelopeDtoBody,
  ): Promise<EnvelopeDto> {
    const updated = await this.envelopes.update(id, user.id, body);
    if (!updated) throw new NotFoundException('Envelope not found');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @SessionUser() user: AuthUser,
  ): Promise<void> {
    const removed = await this.envelopes.delete(id, user.id);
    if (!removed) throw new NotFoundException('Envelope not found');
  }
}
