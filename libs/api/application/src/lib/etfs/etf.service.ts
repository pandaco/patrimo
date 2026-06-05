import { Inject, Injectable } from '@nestjs/common';
import type { Etf, EtfRepository } from '@patrimo/api-domain';
import { EtfDto } from '@patrimo/contracts';
import { ETF_REPOSITORY } from '@patrimo/infrastructure';

function toDto(etf: Etf): EtfDto {
  return {
    isin: etf.isin,
    ticker: etf.ticker,
    name: etf.name,
    issuer: etf.issuer,
    index: etf.index,
    ter: etf.ter,
    currency: etf.currency,
    repli: etf.repli,
    distrib: etf.distrib,
    pea: etf.pea,
    alloc: etf.alloc,
  };
}

@Injectable()
export class EtfService {
  constructor(@Inject(ETF_REPOSITORY) private readonly etfs: EtfRepository) {}

  async list(): Promise<EtfDto[]> {
    const rows = await this.etfs.findAll();
    return rows.map(toDto);
  }
}
