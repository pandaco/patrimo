import { Inject, Injectable } from '@nestjs/common';
import type { EtfRepository, Transaction, TransactionRepository } from 'api-domain';
import { PositionDto } from 'contracts';
import { ETF_REPOSITORY, TRANSACTION_REPOSITORY } from 'infrastructure';

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

    const positions: PositionDto[] = [];
    for (const [isin, pos] of byIsin) {
      if (pos.qty <= 0) continue; // fully sold / never bought
      const etf = etfByIsin.get(isin);
      if (!etf) continue;
      positions.push({
        etfIsin: isin,
        ticker:  etf.ticker,
        name:    etf.name,
        qty:     pos.qty,
        avgPrice: pos.buyQty > 0 ? pos.buyCost / pos.buyQty : 0,
        invested: pos.invested,
      });
    }
    positions.sort((a, b) => b.invested - a.invested);
    return positions;
  }
}
