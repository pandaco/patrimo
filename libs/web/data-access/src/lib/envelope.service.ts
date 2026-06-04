import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CreateEnvelopeDto, UpdateEnvelopeDto } from 'contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { EtfService } from './etf.service';
import { Envelope } from './models';
import { TransactionService } from './transaction.service';

const BOURSE_GLYPHS = new Set(['pea', 'peapme', 'cto', 'av', 'per', 'pee']);
const LIVRET_GLYPHS = new Set(['livret']);

@Injectable({ providedIn: 'root' })
export class EnvelopeService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly txs     = inject(TransactionService);
  private readonly etfs    = inject(EtfService);

  private readonly _all = signal<Envelope[]>([]);
  readonly all = this._all.asReadonly();

  readonly total         = computed(() => this._all().reduce((a, e) => a + e.value, 0));
  readonly totalBourse   = computed(() => this._all().filter(e => BOURSE_GLYPHS.has(e.glyph)).reduce((a, e) => a + e.value, 0));
  readonly totalLivret   = computed(() => this._all().filter(e => LIVRET_GLYPHS.has(e.glyph)).reduce((a, e) => a + e.value, 0));
  readonly totalCash     = computed(() => this._all().reduce((a, e) => a + e.cash, 0));
  readonly totalInvested = computed(() => this._all().reduce((a, e) => a + e.invested, 0));

  async reload(): Promise<void> {
    const list = await firstValueFrom(
      this.http.get<Envelope[]>(`${this.baseUrl}/envelopes`, { withCredentials: true }),
    );
    this._all.set(list);
  }

  async create(input: CreateEnvelopeDto): Promise<Envelope> {
    const created = await firstValueFrom(
      this.http.post<Envelope>(`${this.baseUrl}/envelopes`, input, {
        withCredentials: true,
      }),
    );
    this._all.update(list => [...list, created]);
    return created;
  }

  async update(id: string, input: UpdateEnvelopeDto): Promise<Envelope> {
    const updated = await firstValueFrom(
      this.http.patch<Envelope>(`${this.baseUrl}/envelopes/${id}`, input, {
        withCredentials: true,
      }),
    );
    this._all.update(list => list.map(e => e.id === id ? updated : e));
    return updated;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/envelopes/${id}`, { withCredentials: true }),
    );
    this._all.update(list => list.filter(e => e.id !== id));
    // Backend cascades the delete to the linked transactions; refresh both
    // signals so the dashboard recent-tx, the sidebar badge and the portfolio
    // positions follow without anyone reloading the page.
    this.txs.reload().catch(() => undefined);
    this.etfs.reload().catch(() => undefined);
  }
}
