import { Inject, Injectable } from '@nestjs/common';
import type { Envelope, EnvelopeRepository, EnvelopeSeed } from '@patrimo/api-domain';
import { CreateEnvelopeDto, EnvelopeDto, UpdateEnvelopeDto } from '@patrimo/contracts';
import { ENVELOPE_REPOSITORY } from '@patrimo/infrastructure';

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

function toPatch(input: UpdateEnvelopeDto): Partial<EnvelopeSeed> {
  const patch: Partial<EnvelopeSeed> = {};
  if (input.code     !== undefined) patch.code     = input.code;
  if (input.glyph    !== undefined) patch.glyph    = input.glyph;
  if (input.label    !== undefined) patch.label    = input.label;
  if (input.broker   !== undefined) patch.broker   = input.broker;
  if (input.openedAt !== undefined) patch.openedAt = new Date(input.openedAt);
  if (input.plafond  !== undefined) patch.plafond  = input.plafond;
  return patch;
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

  async create(userId: string, input: CreateEnvelopeDto): Promise<EnvelopeDto> {
    const created = await this.envelopes.create({
      userId,
      code: input.code,
      glyph: input.glyph,
      label: input.label,
      broker: input.broker,
      value: 0,
      invested: 0,
      cash: 0,
      openedAt: new Date(input.openedAt),
      plafond: input.plafond ?? null,
    });
    return toDto(created);
  }

  async update(id: string, userId: string, input: UpdateEnvelopeDto): Promise<EnvelopeDto | null> {
    const updated = await this.envelopes.updateForUser(id, userId, toPatch(input));
    return updated ? toDto(updated) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return this.envelopes.deleteForUser(id, userId);
  }
}
