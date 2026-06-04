import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Envelope, EnvelopeRepository, EnvelopeSeed } from 'api-domain';
import { Repository } from 'typeorm';
import { EnvelopeOrmEntity } from '../orm-entities/envelope.orm-entity';

function toDomain(row: EnvelopeOrmEntity): Envelope {
  return {
    id: row.id,
    userId: row.userId,
    code: row.code,
    glyph: row.glyph,
    label: row.label,
    broker: row.broker,
    value: row.value,
    invested: row.invested,
    cash: row.cash,
    openedAt: row.openedAt,
    plafond: row.plafond,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class TypeOrmEnvelopeRepository implements EnvelopeRepository {
  constructor(
    @InjectRepository(EnvelopeOrmEntity)
    private readonly repo: Repository<EnvelopeOrmEntity>,
  ) {}

  async findById(id: string): Promise<Envelope | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<Envelope[]> {
    const rows = await this.repo.find({ where: { userId }, order: { code: 'ASC' } });
    return rows.map(toDomain);
  }

  async create(seed: EnvelopeSeed): Promise<Envelope> {
    const entity: EnvelopeOrmEntity = this.repo.create(seed as Partial<EnvelopeOrmEntity>);
    const saved: EnvelopeOrmEntity  = await this.repo.save(entity);
    return toDomain(saved);
  }
}
