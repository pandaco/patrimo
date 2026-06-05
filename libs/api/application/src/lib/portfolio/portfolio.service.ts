import { Inject, Injectable } from '@nestjs/common';
import type { EtfRepository, Transaction, TransactionRepository } from 'api-domain';
import { PositionDto, PortfolioExposureDto, ExposureDto, RebalancePlanDto, RebalanceTransactionDto, DividendDto } from 'contracts';
import { ETF_REPOSITORY, TRANSACTION_REPOSITORY } from 'infrastructure';
import { PriceService } from '../market/price.service';
import { PreferencesService } from '../preferences/preferences.service';

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
    private readonly preferences: PreferencesService,
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

  async calculateExposure(userId: string): Promise<PortfolioExposureDto> {
    const positions = await this.listForUser(userId);
    const etfs = await this.etfRepo.findAll();
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));

    const totalValue = positions.reduce((sum, p) => sum + p.qty * (p.currentPrice ?? 0), 0);
    if (totalValue === 0) {
      return { geo: [], sector: [], currency: [] };
    }

    const geoMap = new Map<string, number>();
    const sectorMap = new Map<string, number>();
    const currMap = new Map<string, number>();

    for (const p of positions) {
      const etf = etfByIsin.get(p.etfIsin);
      if (!etf) continue;

      const posValue = p.qty * (p.currentPrice ?? 0);
      const weight = posValue / totalValue;

      let exposure = etf.exposure;
      if (!exposure || Object.keys(exposure.geo).length === 0) {
        const meta = await this.priceService.getMetadata(etf.isin, etf.ticker);
        if (meta) {
          exposure = this.parseYahooExposure(meta);
          this.etfRepo.updateExposure(etf.isin, exposure).catch(console.error);
        }
      }

      if (exposure) {
        this.accumulate(geoMap, exposure.geo, weight);
        this.accumulate(sectorMap, exposure.sector, weight);
        this.accumulate(currMap, exposure.currency, weight);
      }
    }

    return {
      geo: this.finalize(geoMap),
      sector: this.finalize(sectorMap),
      currency: this.finalize(currMap),
    };
  }

  private accumulate(target: Map<string, number>, source: Record<string, number>, weight: number) {
    for (const [key, val] of Object.entries(source)) {
      target.set(key, (target.get(key) ?? 0) + val * weight);
    }
  }

  private finalize(map: Map<string, number>): ExposureDto[] {
    return Array.from(map.entries())
      .map(([key, pct]) => ({ key, pct }))
      .sort((a, b) => b.pct - a.pct);
  }

  private parseYahooExposure(meta: any) {
    const geo: Record<string, number> = {};
    const sector: Record<string, number> = {};
    const currency: Record<string, number> = {};

    const fund = meta?.fundProfile;
    if (fund?.regionHoldings) {
      for (const r of fund.regionHoldings) {
        if (r.region && r.relativeWeight) geo[r.region] = r.relativeWeight;
      }
    }
    if (fund?.sectorWeightings) {
      for (const s of fund.sectorWeightings) {
        const key = Object.keys(s)[0];
        if (key && s[key]) sector[key] = s[key];
      }
    }

    const asset = meta?.assetProfile;
    if (asset?.sector) sector[asset.sector] = 1;
    if (asset?.country) geo[asset.country] = 1;

    return { geo, sector, currency };
  }

  async getRebalancePlan(userId: string): Promise<RebalancePlanDto> {
    const [positions, prefs] = await Promise.all([
      this.listForUser(userId),
      this.preferences.get(userId),
    ]);

    const targets = prefs.allocationTargets?.etf;
    if (!targets || Object.keys(targets).length === 0) {
      return { totalValue: 0, transactions: [] };
    }

    const totalValue = positions.reduce((sum, p) => sum + p.qty * (p.currentPrice ?? 0), 0);
    if (totalValue === 0) return { totalValue: 0, transactions: [] };

    const transactions: RebalanceTransactionDto[] = [];

    for (const [isin, targetWeightPct] of Object.entries(targets)) {
      const pos = positions.find(p => p.etfIsin === isin);
      const currentPrice = pos?.currentPrice ?? 0;
      if (currentPrice === 0) continue;

      const currentWeight = (pos ? pos.qty * currentPrice : 0) / totalValue;
      const targetWeight = targetWeightPct / 100;
      const targetValue = totalValue * targetWeight;
      const diffValue = targetValue - (pos ? pos.qty * currentPrice : 0);

      const qtyDiff = Math.round(diffValue / currentPrice);
      if (qtyDiff === 0) continue;

      transactions.push({
        etfIsin: isin,
        ticker: pos?.ticker ?? '',
        name: pos?.name ?? '',
        action: qtyDiff > 0 ? 'BUY' : 'SELL',
        qty: Math.abs(qtyDiff),
        price: currentPrice,
        amount: Math.abs(qtyDiff * currentPrice),
        currentWeight,
        targetWeight,
      });
    }

    return {
      totalValue,
      transactions: transactions.sort((a, b) => b.amount - a.amount),
    };
  }

  async getUpcomingDividends(userId: string): Promise<DividendDto[]> {
    const positions = await this.listForUser(userId);
    const etfs = await this.etfRepo.findAll();
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));

    const dividends: DividendDto[] = [];

    for (const p of positions) {
      const etf = etfByIsin.get(p.etfIsin);
      if (!etf) continue;

      const meta = await this.priceService.getMetadata(etf.isin, etf.ticker);
      if (!meta) continue;

      const calendar = meta.calendarEvents;
      const summary = meta.summaryDetail;

      if (calendar?.dividendExDate) {
        dividends.push({
          date: new Date(calendar.dividendExDate).toISOString().slice(0, 10),
          ticker: etf.ticker,
          name: etf.name,
          amount: calendar.dividendAmount ?? summary?.dividendRate ?? 0,
          currency: etf.currency,
          status: 'CONFIRMED',
        });
      } else if (summary?.exDividendDate) {
        dividends.push({
          date: new Date(summary.exDividendDate * 1000).toISOString().slice(0, 10),
          ticker: etf.ticker,
          name: etf.name,
          amount: summary.dividendRate ?? 0,
          currency: etf.currency,
          status: 'ESTIMATED',
        });
      }
    }

    return dividends.sort((a, b) => a.date.localeCompare(b.date));
  }
}
