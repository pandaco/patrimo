import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { safeValue } from './safe';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
import { PreferencesService } from './preferences.service';

@Injectable({ providedIn: 'root' })
export class TauxChangeService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);
  private readonly preferences   = inject(PreferencesService);

  private readonly ratesResource = httpResource<Record<string, number>>(
    () => this.auth.isAuthenticated() ? `${this.baseUrl}/market/tauxChange-rates` : undefined,
    { defaultValue: { EUR: 1 } },
  );

  readonly rates = computed(() => safeValue(this.ratesResource, {}));

  readonly displayCurrency = computed(() => this.preferences.current()?.displayCurrency || 'EUR');

  readonly rate = computed(() => {
    const currency = this.displayCurrency();
    if (currency === 'EUR') return 1;
    return this.rates()?.[currency] ?? 1;
  });

  convert(eur: number): number { return eur * this.rate(); }

  symbol(): string {
    const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' };
    return symbols[this.displayCurrency()] ?? this.displayCurrency();
  }

  /**
   * Convert an EUR-base amount to the display currency and format it with
   * the right symbol — drop-in replacement for the `fmtEur` helper in
   * components. Non-breaking spaces are normalised like in `fmtEur`.
   */
  fmt(eur: number, d = 2): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.displayCurrency(),
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
      .format(this.convert(eur))
      .replace(/\u00A0/g, ' ')
      .replace(/\u202F/g, ' ');
  }
}
