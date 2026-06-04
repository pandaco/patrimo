import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EtfDto, PositionDto } from 'contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { MOCK_SPARKS } from './mock-data';
import { Etf } from './models';

export const etfValue  = (e: Etf) => e.qty * e.price;
export const etfCost   = (e: Etf) => e.qty * e.pru;
export const etfPnl    = (e: Etf) => etfValue(e) - etfCost(e);
export const etfPnlPct = (e: Etf) => {
  const cost = etfCost(e);
  return cost ? etfValue(e) / cost - 1 : 0;
};
export const etfDayPct = (e: Etf) => (e.prev ? e.price / e.prev - 1 : 0);

/**
 * Catalog rows are baseline ETFs with zeroed position + market fields. The
 * `mergePosition()` helper layers per-user qty/pru on top, and a future
 * market-data feed will fill in `price`, `prev`, `perf1y`, `perfYtd`.
 * Until the market feed lands, `price` is set to `pru` so cost basis and
 * current value match (PnL = 0) instead of inventing prices.
 */
function fromCatalog(d: EtfDto): Etf {
  return {
    isin: d.isin,
    ticker: d.ticker,
    name: d.name,
    issuer: d.issuer,
    index: d.index,
    ter: d.ter,
    currency: d.currency,
    repli: d.repli,
    distrib: d.distrib,
    pea: d.pea,
    alloc: d.alloc,
    qty: 0,
    pru: 0,
    price: 0,
    prev: 0,
    perf1y: 0,
    perfYtd: 0,
  };
}

function mergePosition(etf: Etf, position: PositionDto | undefined): Etf {
  if (!position) return etf;
  // Market data is best-effort: when Yahoo returns null we fall back to the
  // PRU so cost basis and current value match (PnL = 0) instead of inventing
  // numbers.
  const price = position.currentPrice ?? position.avgPrice;
  const prev  = position.prevClose    ?? price;
  return {
    ...etf,
    qty:   position.qty,
    pru:   position.avgPrice,
    price,
    prev,
  };
}

@Injectable({ providedIn: 'root' })
export class EtfService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _all = signal<Etf[]>([]);
  readonly all    = this._all.asReadonly();
  readonly sparks = signal<Record<string, number[]>>(MOCK_SPARKS);

  async reload(): Promise<void> {
    const [catalog, positions] = await Promise.all([
      firstValueFrom(
        this.http.get<EtfDto[]>(`${this.baseUrl}/etfs`, { withCredentials: true }),
      ),
      firstValueFrom(
        this.http.get<PositionDto[]>(`${this.baseUrl}/portfolio`, { withCredentials: true }),
      ),
    ]);
    const positionByIsin = new Map(positions.map(p => [p.etfIsin, p]));
    this._all.set(catalog.map(c => mergePosition(fromCatalog(c), positionByIsin.get(c.isin))));
  }
}
