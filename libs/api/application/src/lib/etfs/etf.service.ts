import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Etf, EtfRepository, TransactionRepository } from '@patrimo/api-domain';
import { CreateEtfDto, EtfDto, EtfLookupResultDto } from '@patrimo/contracts';
import { UpdateEtfDtoBody } from './dto/update-etf.dto';
import { ETF_REPOSITORY, TRANSACTION_REPOSITORY } from '@patrimo/infrastructure';
import { PriceService } from '../market/price.service';

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
    exposure: etf.exposure,
  };
}

@Injectable()
export class EtfService {
  constructor(
    @Inject(ETF_REPOSITORY)         private readonly etfs: EtfRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactions: TransactionRepository,
    private readonly prices: PriceService,
  ) {}

  async list(): Promise<EtfDto[]> {
    const rows = await this.etfs.findAll();
    return rows.map(toDto);
  }

  /** Yahoo free-text search (ISIN, ticker or name) feeding the add-ETF dialog. */
  async lookup(query: string): Promise<EtfLookupResultDto[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      throw new BadRequestException('query must be at least 2 characters');
    }
    return this.prices.searchSymbols(trimmed);
  }

  /**
   * Add a user-supplied ETF to the catalog. The Yahoo symbol is validated
   * up front — a quote without a price means the `<ticker>.PA` fallback would
   * fail silently later (the known limitation this endpoint closes), so the
   * creation is rejected instead. A catalog entry is not a holding: a
   * position only exists once a BUY transaction references it.
   */
  async create(input: CreateEtfDto): Promise<EtfDto> {
    const existing = await this.etfs.findByIsin(input.isin);
    if (existing) {
      throw new ConflictException(`ETF ${input.isin} already exists (${existing.ticker})`);
    }

    const quote = await this.prices.getQuote(input.isin, input.ticker);
    if (quote.price == null) {
      throw new BadRequestException(
        `Yahoo Finance returned no price for ${input.ticker} (${input.isin}) — check the ticker`,
      );
    }

    const created = await this.etfs.upsert({
      isin: input.isin,
      ticker: input.ticker,
      name: input.name,
      issuer: input.issuer ?? '',
      index: input.index ?? '',
      ter: input.ter,
      currency: input.currency,
      repli: input.repli ?? '',
      distrib: input.distrib,
      pea: input.pea,
      alloc: input.alloc,
    });
    return toDto(created);
  }

  async update(isin: string, input: UpdateEtfDtoBody): Promise<EtfDto> {
    const existing = await this.etfs.findByIsin(isin);
    if (!existing) throw new NotFoundException(`Unknown ETF: ${isin}`);
    const updated = await this.etfs.upsert({
      isin:      existing.isin,
      ticker:    input.ticker   ?? existing.ticker,
      name:      input.name     ?? existing.name,
      issuer:    input.issuer   ?? existing.issuer,
      index:     input.index    ?? existing.index,
      ter:       input.ter      ?? existing.ter,
      currency:  input.currency ?? existing.currency,
      repli:     input.repli    ?? existing.repli,
      distrib:   input.distrib  ?? existing.distrib,
      pea:       input.pea      ?? existing.pea,
      alloc:     input.alloc    ?? existing.alloc,
    });
    return toDto(updated);
  }

  /** Remove a catalog entry — refused while any of the user's transactions reference it. */
  async delete(userId: string, isin: string): Promise<void> {
    const etf = await this.etfs.findByIsin(isin);
    if (!etf) throw new NotFoundException(`Unknown ETF: ${isin}`);

    const transactions = await this.transactions.findByUserId(userId);
    if (transactions.some(t => t.etfIsin === isin)) {
      throw new ConflictException(
        `ETF ${etf.ticker} has transactions attached — delete them first`,
      );
    }

    await this.etfs.deleteByIsin(isin);
  }
}
