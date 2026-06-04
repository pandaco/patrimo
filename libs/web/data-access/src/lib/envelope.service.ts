import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { Envelope } from './models';

const BOURSE_GLYPHS = new Set(['pea', 'peapme', 'cto', 'av', 'per', 'pee']);
const LIVRET_GLYPHS = new Set(['livret']);

@Injectable({ providedIn: 'root' })
export class EnvelopeService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

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
}
