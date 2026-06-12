import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { CreateEtfDto, EtfDto, PositionDto } from '@patrimo/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
import { Etf } from './models';

export const etfValue  = (e: Etf) => e.qty * e.price;
export const etfCost   = (e: Etf) => e.qty * e.pru;
export const etfPnl    = (e: Etf) => etfValue(e) - etfCost(e);
export const etfPnlPct = (e: Etf) => {
  const cost = etfCost(e);
  return cost ? etfValue(e) / cost - 1 : 0;
};
export const etfDayPct = (e: Etf) => (e.prev ? e.price / e.prev - 1 : 0);

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
    watchOnly: d.watchOnly,
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
  private readonly auth    = inject(AuthService);

  // Two `httpResource`s wired against the same auth gate. Both auto-fetch
  // when `isAuthenticated()` flips from false to true, and re-run on every
  // `reload()` (called by transaction / envelope mutations).
  private readonly catalogResource = httpResource<EtfDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/etfs` : undefined),
    { defaultValue: [] },
  );

  private readonly portfolioResource = httpResource<PositionDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/portfolio` : undefined),
    { defaultValue: [] },
  );

  readonly all = computed<Etf[]>(() => {
    const catalog = this.catalogResource.value();
    const byIsin  = new Map(this.portfolioResource.value().map(p => [p.etfIsin, p]));
    return catalog.map(c => mergePosition(fromCatalog(c), byIsin.get(c.isin)));
  });

  readonly loading = computed(() => this.catalogResource.isLoading() || this.portfolioResource.isLoading());
  readonly error   = computed(() => this.catalogResource.error() ?? this.portfolioResource.error());

  private readonly sparksResource = httpResource<Record<string, number[]>>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/portfolio/sparks` : undefined),
    { defaultValue: {} },
  );

  readonly sparks = this.sparksResource.value;

  reload(): void {
    this.catalogResource.reload();
    this.portfolioResource.reload();
  }

  /** Toggle the watchlist flag and patch the local catalog in place. */
  async setWatchOnly(isin: string, watchOnly: boolean): Promise<void> {
    const updated = await firstValueFrom(
      this.http.patch<EtfDto>(`${this.baseUrl}/etfs/${isin}/watch`, { watchOnly }),
    );
    this.catalogResource.update(list => list.map(e => e.isin === updated.isin ? updated : e));
  }

  /** Add a user-supplied ETF to the catalog (backend validates the Yahoo symbol first). */
  async create(input: CreateEtfDto): Promise<EtfDto> {
    const created = await firstValueFrom(
      this.http.post<EtfDto>(`${this.baseUrl}/etfs`, input),
    );
    this.catalogResource.reload();
    return created;
  }

  /** Remove a catalog entry — the backend refuses while transactions reference it. */
  async remove(isin: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/etfs/${encodeURIComponent(isin)}`),
    );
    this.catalogResource.reload();
  }

  /**
   * Forces a fresh Yahoo fetch for every held ETF via
   * `POST /api/portfolio/refresh`, then reloads the local resources so the
   * dashboard reflects the new prices instead of the 15-min-cached ones.
   */
  async forceRefresh(): Promise<void> {
    await firstValueFrom(
      this.http.post<PositionDto[]>(`${this.baseUrl}/portfolio/refresh`, null),
    );
    this.reload();
  }
}
