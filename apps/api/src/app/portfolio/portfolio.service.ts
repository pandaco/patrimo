import { Inject, Injectable } from '@nestjs/common';
import type { EtfRepository, Transaction, TransactionRepository } from 'api-domain';
import { PositionDto } from 'contracts';
import { ETF_REPOSITORY, TRANSACTION_REPOSITORY } from 'infrastructure';
import { PriceService } from '../market/price.service';

interface PositionAccumulator {
  qty:      number;
  invested: number; // signed: BUY adds (cost+fees), SELL subtracts (proceeds-fees)
  buyQty:   number;
  buyCost:  number;
}

function emptyPosition(): PositionAccumulator {
  return { qty: 0, invested: 0, buyQty: 0, buyCost: 0 };
}

function applyTransaction(pos: PositionAccumulator, tx: Transaction): void {
  if (tx.type !== 'BUY' && tx.type !== 'SELL') return;
  const sign      = tx.type === 'BUY' ? 1 : -1;
  const price     = tx.price ?? 0;
  const fees      = tx.fees ?? 0;
  const grossCost = tx.quantity * price + (tx.type === 'BUY' ? fees : -fees);
  pos.qty      += sign * tx.quantity;
  pos.invested += sign * grossCost;
  if (sign > 0) {
    pos.buyQty  += tx.quantity;
    pos.buyCost += grossCost;
  }
}

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: TransactionRepository,
    @Inject(ETF_REPOSITORY)         private readonly etfRepo: EtfRepository,
    private readonly priceService: PriceService,
  ) {}

  async listForUser(userId: string): Promise<PositionDto[]> {
    const [txs, etfs] = await Promise.all([
      this.txRepo.findByUserId(userId),
      this.etfRepo.findAll(),
    ]);
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));

    const byIsin = new Map<string, PositionAccumulator>();
    for (const tx of txs) {
      if (!tx.etfIsin) continue;
      const pos = byIsin.get(tx.etfIsin) ?? emptyPosition();
      applyTransaction(pos, tx);
      byIsin.set(tx.etfIsin, pos);
    }

    const positions = await Promise.all(
      Array.from(byIsin.entries())
        .filter(([isin, pos]) => pos.qty > 0 && etfByIsin.has(isin))
        .map(async ([isin, pos]) => {
          const etf = etfByIsin.get(isin);
          if (!etf) return null;
          const quote = await this.priceService.getQuote(isin, etf.ticker);
          return {
            etfIsin: isin,
            ticker:  etf.ticker,
            name:    etf.name,
            qty:     pos.qty,
            avgPrice: pos.buyQty > 0 ? pos.buyCost / pos.buyQty : 0,
            invested: pos.invested,
            currentPrice: quote.price,
            prevClose:    quote.prevClose,
          } satisfies PositionDto;
        }),
    );

    return positions
      .filter((p): p is PositionDto => p !== null)
      .sort((a, b) => b.invested - a.invested);
  }

  /**
   * Same as `listForUser`, but force a fresh Yahoo fetch for every held ETF
   * before computing the response. The Redis 15 min TTL is bypassed via
   * `PriceService.refreshQuote` so the next regular `GET /portfolio` (still
   * cached) also benefits from the refreshed values.
   */
  async refreshForUser(userId: string): Promise<PositionDto[]> {
    const [txs, etfs] = await Promise.all([
      this.txRepo.findByUserId(userId),
      this.etfRepo.findAll(),
    ]);
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));
    const heldIsins = new Set(
      txs.filter(t => t.etfIsin && (t.type === 'BUY' || t.type === 'SELL'))
         .map(t => t.etfIsin as string),
    );
    await Promise.allSettled(
      Array.from(heldIsins).map(isin => {
        const etf = etfByIsin.get(isin);
        return etf ? this.priceService.refreshQuote(isin, etf.ticker) : Promise.resolve();
      }),
    );
    return this.listForUser(userId);
  }
}
