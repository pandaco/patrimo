import { Injectable, computed, signal } from '@angular/core';
import { Envelope } from './models';
import { MOCK_ENVELOPES } from './mock-data';

const BOURSE_IDS = new Set(['pea', 'peapme', 'cto', 'av', 'per', 'pee']);
const LIVRET_IDS = new Set(['livreta', 'ldds']);

@Injectable({ providedIn: 'root' })
export class EnvelopeService {
  readonly all = signal<Envelope[]>(MOCK_ENVELOPES);

  readonly total         = computed(() => this.all().reduce((a, e) => a + e.value, 0));
  readonly totalBourse   = computed(() => this.all().filter(e => BOURSE_IDS.has(e.id)).reduce((a, e) => a + e.value, 0));
  readonly totalLivret   = computed(() => this.all().filter(e => LIVRET_IDS.has(e.id)).reduce((a, e) => a + e.value, 0));
  readonly totalCash     = computed(() => this.all().reduce((a, e) => a + e.cash, 0));
  readonly totalInvested = computed(() => this.all().reduce((a, e) => a + e.invested, 0));
}
