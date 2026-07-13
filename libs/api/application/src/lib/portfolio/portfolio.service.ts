import { Inject, Injectable } from '@nestjs/common';
import type { EtfRepository, Transaction, TransactionRepository } from '@patrimo/api-domain';
import { PositionDto, PortfolioExposureDto, ExposureDto, RebalancePlanDto, RebalanceTransactionDto, DividendDto, IncomeForecastDto, PositionIncomeDto } from '@patrimo/contracts';
import { ETF_REPOSITORY, TRANSACTION_REPOSITORY } from '@patrimo/infrastructure';
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

function applyTransaction(position: PositionAccumulator, transaction: Transaction): void {
  if (transaction.type !== 'BUY' && transaction.type !== 'SELL') return;
  const sign      = transaction.type === 'BUY' ? 1 : -1;
  const price     = transaction.price ?? 0;
  // Taxes follow the same direction as fees: they raise the cost of a BUY
  // and shrink the proceeds of a SELL.
  const costs     = (transaction.fees ?? 0) + (transaction.taxes ?? 0);
  const grossCost = transaction.quantity * price + (transaction.type === 'BUY' ? costs : -costs);
  position.qty      += sign * transaction.quantity;
  position.invested += sign * grossCost;
  if (sign > 0) {
    position.buyQty  += transaction.quantity;
    position.buyCost += grossCost;
  }
}

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: TransactionRepository,
    @Inject(ETF_REPOSITORY)         private readonly etfRepository: EtfRepository,
    private readonly priceService: PriceService,
    private readonly preferences: PreferencesService,
  ) {}

  async listForUser(userId: string): Promise<PositionDto[]> {
    const [transactions, etfs] = await Promise.all([
      this.transactionRepository.findByUserId(userId),
      this.etfRepository.findAll(),
    ]);
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));

    const byIsin = new Map<string, PositionAccumulator>();
    for (const transaction of transactions) {
      if (!transaction.etfIsin) continue;
      const position = byIsin.get(transaction.etfIsin) ?? emptyPosition();
      applyTransaction(position, transaction);
      byIsin.set(transaction.etfIsin, position);
    }

    const positions = await Promise.all(
      Array.from(byIsin.entries())
        .filter(([isin, position]) => position.qty > 0 && etfByIsin.has(isin))
        .map(async ([isin, position]) => {
          const etf = etfByIsin.get(isin);
          if (!etf) return null;
          const quote = await this.priceService.getQuote(isin, etf.ticker);
          return {
            etfIsin: isin,
            ticker:  etf.ticker,
            name:    etf.name,
            qty:     position.qty,
            avgPrice: position.buyQty > 0 ? position.buyCost / position.buyQty : 0,
            invested: position.invested,
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
    const [transactions, etfs] = await Promise.all([
      this.transactionRepository.findByUserId(userId),
      this.etfRepository.findAll(),
    ]);
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));
    const heldIsins = new Set(
      transactions.filter(t => t.etfIsin && (t.type === 'BUY' || t.type === 'SELL'))
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
    const etfs = await this.etfRepository.findAll();
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));

    const totalValue = positions.reduce((sum, p) => sum + p.qty * (p.currentPrice ?? 0), 0);
    if (totalValue === 0) {
      return { geography: [], sector: [], currency: [] };
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
      let fetchedNew = false;
      const geoEmpty = !exposure?.geography || Object.keys(exposure.geography).length === 0;
      const secEmpty = !exposure?.sector || Object.keys(exposure.sector).length === 0;
      
      if (!exposure || (geoEmpty && secEmpty)) {
        const meta = await this.priceService.getMetadata(etf.isin, etf.ticker);
        if (meta) {
          exposure = this.parseYahooExposure(meta);
          fetchedNew = true;
        }
      }

      // Merge JustETF data if geography or sector is still empty
      if (!exposure?.geography || Object.keys(exposure.geography).length === 0 || !exposure?.sector || Object.keys(exposure.sector).length === 0) {
        const justEtfExp = await this.priceService.getEtfExposure(etf.isin);
        if (!exposure) {
          exposure = { geography: {}, sector: {}, currency: {} };
          fetchedNew = true;
        }
        if (Object.keys(justEtfExp.geography).length > 0) {
          exposure.geography = justEtfExp.geography;
          fetchedNew = true;
        }
        if (Object.keys(justEtfExp.sector).length > 0) {
          exposure.sector = justEtfExp.sector;
          fetchedNew = true;
        }
      }

      if (exposure) {
        if (fetchedNew) {
          this.etfRepository.updateExposure(etf.isin, exposure).catch(console.error);
        }
        this.accumulate(geoMap, exposure.geography || {}, weight);
        this.accumulate(sectorMap, exposure.sector || {}, weight);
        this.accumulate(currMap, exposure.currency || {}, weight);
      }
    }

    return {
      geography: this.finalize(geoMap),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseYahooExposure(meta: any) {
    const geography: Record<string, number> = {};
    const sector: Record<string, number> = {};
    const currency: Record<string, number> = {};

    const fund = meta?.fundProfile;
    const topHoldings = meta?.topHoldings;
    
    // Some funds return regionHoldings under fundProfile. We can try that.
    if (fund?.regionHoldings) {
      for (const r of fund.regionHoldings) {
        if (r.region && r.relativeWeight) geography[r.region] = r.relativeWeight;
      }
    }

    // sectorWeightings is often found in topHoldings.
    const sectors = topHoldings?.sectorWeightings || fund?.sectorWeightings;
    if (sectors) {
      for (const s of sectors) {
        const key = Object.keys(s)[0];
        if (key && s[key]) sector[key] = s[key];
      }
    }

    const asset = meta?.assetProfile;
    if (asset?.sector) sector[asset.sector] = 1;
    if (asset?.country) geography[asset.country] = 1;

    return { geography, sector, currency };
  }

  async getRebalancePlan(userId: string): Promise<RebalancePlanDto> {
    const [positions, userPreferences] = await Promise.all([
      this.listForUser(userId),
      this.preferences.get(userId),
    ]);

    const targets = userPreferences.allocationTargets?.etf;
    if (!targets || Object.keys(targets).length === 0) {
      return { totalValue: 0, transactions: [] };
    }

    const totalValue = positions.reduce((sum, p) => sum + p.qty * (p.currentPrice ?? 0), 0);
    if (totalValue === 0) return { totalValue: 0, transactions: [] };

    const transactions: RebalanceTransactionDto[] = [];

    for (const [isin, targetWeightPct] of Object.entries(targets)) {
      const position = positions.find(p => p.etfIsin === isin);
      const currentPrice = position?.currentPrice ?? 0;
      if (currentPrice === 0) continue;

      const currentWeight = (position ? position.qty * currentPrice : 0) / totalValue;
      const targetWeight = targetWeightPct / 100;
      const targetValue = totalValue * targetWeight;
      const diffValue = targetValue - (position ? position.qty * currentPrice : 0);

      const qtyDiff = Math.round(diffValue / currentPrice);
      if (qtyDiff === 0) continue;

      transactions.push({
        etfIsin: isin,
        ticker: position?.ticker ?? '',
        name: position?.name ?? '',
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

  async getSparks(userId: string): Promise<Record<string, number[]>> {
    const [transactions, etfs] = await Promise.all([
      this.transactionRepository.findByUserId(userId),
      this.etfRepository.findAll(),
    ]);
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));
    const heldIsins = new Set(
      transactions
        .filter(t => t.etfIsin && (t.type === 'BUY' || t.type === 'SELL'))
        .map(t => t.etfIsin as string),
    );
    const results: Record<string, number[]> = {};
    await Promise.allSettled(
      Array.from(heldIsins).map(async isin => {
        const etf = etfByIsin.get(isin);
        if (!etf) return;
        const history = await this.priceService.getHistorical(isin, etf.ticker, 30);
        if (history.length === 0) return;
        const closes = history.map(p => p.close);
        const base = closes[0];
        results[etf.ticker] = closes.map(c => +(c / base * 100).toFixed(2));
      }),
    );
    return results;
  }

  async exportCsv(userId: string): Promise<string> {
    const positions = await this.listForUser(userId);
    const header = 'Ticker,Nom,Quantité,PRU (€),Prix actuel (€),Valeur (€),PnL (€),PnL (%)\n';
    const rows = positions.map(p => {
      const price  = p.currentPrice ?? p.avgPrice;
      const value  = p.qty * price;
      const cost   = p.qty * p.avgPrice;
      const plusValue    = value - cost;
      const pnlPct = cost > 0 ? ((value / cost - 1) * 100).toFixed(2) : '0.00';
      return [p.ticker, `"${p.name}"`, p.qty, p.avgPrice.toFixed(4), price.toFixed(4),
              value.toFixed(2), plusValue.toFixed(2), pnlPct].join(',');
    });
    return header + rows.join('\n');
  }

  /**
   * Income view per held position: dividends actually received over the
   * trailing 12 months (yield on cost) plus a forward projection from the
   * fund's current annual distribution rate (Yahoo). Capitalising ETFs report
   * zero on both — they reinvest internally — and are filtered out.
   */
  async getIncomeForecast(userId: string): Promise<IncomeForecastDto> {
    const [positions, transactions] = await Promise.all([
      this.listForUser(userId),
      this.transactionRepository.findByUserId(userId),
    ]);

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    const trailingByIsin = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'DIVIDEND' || !t.etfIsin || t.date < cutoff) continue;
      trailingByIsin.set(t.etfIsin, (trailingByIsin.get(t.etfIsin) ?? 0) + t.amount);
    }

    const rows = await Promise.all(positions.map(async (p): Promise<PositionIncomeDto> => {
      const costBasis    = p.invested;
      const currentValue = p.qty * (p.currentPrice ?? p.avgPrice);
      const trailing12m  = trailingByIsin.get(p.etfIsin) ?? 0;

      let annualRate = 0;
      try {
        const meta = await this.priceService.getMetadata(p.etfIsin, p.ticker);
        annualRate = meta?.summaryDetail?.dividendRate
          ?? meta?.summaryDetail?.trailingAnnualDividendRate
          ?? 0;
      } catch { /* unknown rate → treat as non-distributing */ }

      const forwardAnnualIncome = Number((p.qty * annualRate).toFixed(2));
      return {
        etfIsin: p.etfIsin,
        ticker:  p.ticker,
        name:    p.name,
        qty:     p.qty,
        costBasis:            Number(costBasis.toFixed(2)),
        currentValue:         Number(currentValue.toFixed(2)),
        trailing12mDividends: Number(trailing12m.toFixed(2)),
        yieldOnCostPct:  costBasis > 0 ? Number((trailing12m / costBasis * 100).toFixed(2)) : 0,
        forwardAnnualIncome,
        forwardYieldPct: currentValue > 0 ? Number((forwardAnnualIncome / currentValue * 100).toFixed(2)) : 0,
      };
    }));

    const totalTrailing12m   = rows.reduce((a, r) => a + r.trailing12mDividends, 0);
    const totalForwardAnnual = rows.reduce((a, r) => a + r.forwardAnnualIncome, 0);
    const totalCostBasis     = rows.reduce((a, r) => a + r.costBasis, 0);
    const totalValue         = rows.reduce((a, r) => a + r.currentValue, 0);

    return {
      positions: rows
        .filter(r => r.trailing12mDividends > 0 || r.forwardAnnualIncome > 0)
        .sort((a, b) => b.forwardAnnualIncome - a.forwardAnnualIncome),
      totalTrailing12m:   Number(totalTrailing12m.toFixed(2)),
      totalForwardAnnual: Number(totalForwardAnnual.toFixed(2)),
      portfolioYieldOnCostPct:  totalCostBasis > 0 ? Number((totalTrailing12m / totalCostBasis * 100).toFixed(2)) : 0,
      portfolioForwardYieldPct: totalValue > 0 ? Number((totalForwardAnnual / totalValue * 100).toFixed(2)) : 0,
    };
  }

  async getUpcomingDividends(userId: string): Promise<DividendDto[]> {
    const positions = await this.listForUser(userId);
    const etfs = await this.etfRepository.findAll();
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
