import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EtfDto } from 'contracts';
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
 * The catalog DTO carries no per-user position data (qty, pru) and no
 * market data (price, prev, perf1y, perfYtd). Zero them until the Position
 * projection and the market-data provider land — components render `0` /
 * `—` instead of fictional numbers.
 */
function fromDto(d: EtfDto): Etf {
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

@Injectable({ providedIn: 'root' })
export class EtfService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _all = signal<Etf[]>([]);
  readonly all    = this._all.asReadonly();
  readonly sparks = signal<Record<string, number[]>>(MOCK_SPARKS);

  async reload(): Promise<void> {
    const list = await firstValueFrom(
      this.http.get<EtfDto[]>(`${this.baseUrl}/etfs`, { withCredentials: true }),
    );
    this._all.set(list.map(fromDto));
  }
}
