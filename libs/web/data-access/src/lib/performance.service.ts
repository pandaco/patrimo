import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { PerformancePeriod, PerformanceSeriesDto } from '@patrimo/contracts';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  /** Period the resource is currently fetching for. Components mutate this signal. */
  readonly period = signal<PerformancePeriod>('6M');

  private readonly resource = httpResource<PerformanceSeriesDto>(
    () => (this.auth.isAuthenticated()
      ? `${this.baseUrl}/performance/series?period=${this.period()}`
      : undefined),
    {
      defaultValue: { period: '6M', count: 0, labels: [], portfolio: [], benchmark: null, drawdowns: [] },
    },
  );

  /**
   * Legacy view used by the dashboard's `PerfChartComponent`: a `{ portfolio,
   * benchmark }` object. Keep the same shape the chart expects so its math
   * does not need to change — the data feeding it is now real.
   */
  readonly series = computed(() => {
    const dto = this.resource.value();
    return {
      portfolio: dto.portfolio,
      benchmark: dto.benchmark ?? [],
    };
  });

  readonly raw     = this.resource.value;
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  setPeriod(period: PerformancePeriod): void { this.period.set(period); }
  reload(): void { this.resource.reload(); }
}
