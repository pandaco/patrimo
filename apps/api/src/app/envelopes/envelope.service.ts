import { Inject, Injectable } from '@nestjs/common';
import type { Envelope, EnvelopeRepository } from 'api-domain';
import { EnvelopeDto } from 'contracts';
import { ENVELOPE_REPOSITORY } from 'infrastructure';

function toDto(envelope: Envelope): EnvelopeDto {
  return {
    id: envelope.id,
    code: envelope.code,
    glyph: envelope.glyph,
    label: envelope.label,
    broker: envelope.broker,
    value: envelope.value,
    invested: envelope.invested,
    cash: envelope.cash,
    openedAt: envelope.openedAt.toISOString().slice(0, 10),
    plafond: envelope.plafond,
  };
}

@Injectable()
export class EnvelopeService {
  constructor(
    @Inject(ENVELOPE_REPOSITORY) private readonly envelopes: EnvelopeRepository,
  ) {}

  async listForUser(userId: string): Promise<EnvelopeDto[]> {
    const rows = await this.envelopes.findByUserId(userId);
    return rows.map(toDto);
  }
}
