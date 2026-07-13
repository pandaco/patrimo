import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { CreateEnvelopeDto, UpdateEnvelopeDto } from '@patrimo/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { safeValue } from './safe';
import { AuthService } from './auth.service';
import { EtfService } from './etf.service';
import { Envelope } from './models';
import { TransactionService } from './transaction.service';

const BOURSE_GLYPHS = new Set(['pea', 'peapme', 'cto', 'av', 'per', 'pee']);
const LIVRET_GLYPHS = new Set(['livret']);

@Injectable({ providedIn: 'root' })
export class EnvelopeService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);
  private readonly transactions     = inject(TransactionService);
  private readonly etfs    = inject(EtfService);

  // httpResource auto-fetches whenever its URL factory returns a string. We
  // gate it on `auth.isAuthenticated()` so the request only goes out once
  // `AuthService.loadCurrentUser()` has resolved; before then the factory
  // returns `undefined` and the resource sits on its `defaultValue`.
  // `withCredentials` is added by `authInterceptor` for every same-API URL.
  private readonly resource = httpResource<Envelope[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/envelopes` : undefined),
    { defaultValue: [] },
  );

  readonly all     = computed(() => safeValue(this.resource, [] as Envelope[]));
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  readonly total         = computed(() => this.all().reduce((a, e) => a + e.value, 0));
  readonly totalBourse   = computed(() => this.all().filter(e => BOURSE_GLYPHS.has(e.glyph)).reduce((a, e) => a + e.value, 0));
  readonly totalLivret   = computed(() => this.all().filter(e => LIVRET_GLYPHS.has(e.glyph)).reduce((a, e) => a + e.value, 0));
  readonly totalCash     = computed(() => this.all().reduce((a, e) => a + e.cash, 0));
  readonly totalInvested = computed(() => this.all().reduce((a, e) => a + e.invested, 0));

  reload(): void { this.resource.reload(); }

  async create(input: CreateEnvelopeDto): Promise<Envelope> {
    const created = await firstValueFrom(
      this.http.post<Envelope>(`${this.baseUrl}/envelopes`, input),
    );
    this.resource.update(list => [...list, created]);
    return created;
  }

  async update(id: string, input: UpdateEnvelopeDto): Promise<Envelope> {
    const updated = await firstValueFrom(
      this.http.patch<Envelope>(`${this.baseUrl}/envelopes/${id}`, input),
    );
    this.resource.update(list => list.map(e => (e.id === id ? updated : e)));
    return updated;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/envelopes/${id}`));
    this.resource.update(list => list.filter(e => e.id !== id));
    // The backend cascades the delete to the linked transactions; refresh
    // both sibling resources so the dashboard, the sidebar badge and the
    // portfolio positions follow without anyone reloading the page.
    this.transactions.reload();
    this.etfs.reload();
  }
}
