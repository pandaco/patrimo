import { Injectable, signal } from '@angular/core';
import { Etf } from './models';
import { MOCK_ETFS, MOCK_SPARKS } from './mock-data';

export const etfValue  = (e: Etf) => e.qty * e.price;
export const etfCost   = (e: Etf) => e.qty * e.pru;
export const etfPnl    = (e: Etf) => etfValue(e) - etfCost(e);
export const etfPnlPct = (e: Etf) => {
  const cost = etfCost(e);
  return cost ? etfValue(e) / cost - 1 : 0;
};
export const etfDayPct = (e: Etf) => (e.prev ? e.price / e.prev - 1 : 0);

@Injectable({ providedIn: 'root' })
export class EtfService {
  readonly all    = signal<Etf[]>(MOCK_ETFS);
  readonly sparks = signal<Record<string, number[]>>(MOCK_SPARKS);
}
