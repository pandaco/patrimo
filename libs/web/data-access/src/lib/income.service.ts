import { httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { IncomeForecastDto } from '@patrimo/contracts';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<IncomeForecastDto>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/portfolio/income` : undefined),
    {
      defaultValue: {
        positions: [], totalTrailing12m: 0, totalForwardAnnual: 0,
        portfolioYieldOnCostPct: 0, portfolioForwardYieldPct: 0,
      },
    },
  );

  readonly forecast = this.resource.value;
  readonly loading  = this.resource.isLoading;

  reload(): void { this.resource.reload(); }
}
