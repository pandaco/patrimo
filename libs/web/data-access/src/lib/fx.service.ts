import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
import { PreferencesService } from './preferences.service';

@Injectable({ providedIn: 'root' })
export class FxService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);
  private readonly prefs   = inject(PreferencesService);

  private readonly ratesResource = httpResource<Record<string, number>>(
    () => this.auth.isAuthenticated() ? `${this.baseUrl}/market/fx-rates` : undefined,
    { defaultValue: { EUR: 1 } },
  );

  readonly rates = this.ratesResource.value;

  readonly displayCurrency = computed(() => this.prefs.current().displayCurrency);

  readonly rate = computed(() => {
    const cur = this.displayCurrency();
    if (cur === 'EUR') return 1;
    return this.rates()[cur] ?? 1;
  });

  convert(eur: number): number { return eur * this.rate(); }

  symbol(): string {
    const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' };
    return symbols[this.displayCurrency()] ?? this.displayCurrency();
  }
}
