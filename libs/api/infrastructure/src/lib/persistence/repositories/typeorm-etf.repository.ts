import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Etf, EtfRepository, EtfSeed } from 'api-domain';
import { Repository } from 'typeorm';
import { EtfOrmEntity } from '../orm-entities/etf.orm-entity';

function toDomain(row: EtfOrmEntity): Etf {
  return {
    isin: row.isin,
    ticker: row.ticker,
    name: row.name,
    issuer: row.issuer,
    index: row.index,
    ter: row.ter,
    currency: row.currency,
    repli: row.repli,
    distrib: row.distrib,
    pea: row.pea,
    alloc: row.alloc,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class TypeOrmEtfRepository implements EtfRepository {
  constructor(
    @InjectRepository(EtfOrmEntity)
    private readonly repo: Repository<EtfOrmEntity>,
  ) {}

  async findAll(): Promise<Etf[]> {
    const rows = await this.repo.find({ order: { ticker: 'ASC' } });
    return rows.map(toDomain);
  }

  async findByIsin(isin: string): Promise<Etf | null> {
    const row = await this.repo.findOne({ where: { isin } });
    return row ? toDomain(row) : null;
  }

  async upsert(seed: EtfSeed): Promise<Etf> {
    await this.repo.upsert(seed, ['isin']);
    const saved = await this.repo.findOneOrFail({ where: { isin: seed.isin } });
    return toDomain(saved);
  }
}
