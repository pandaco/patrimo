import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { EtfStatsDto, FeesYtdDto, PerformancePeriod, PerformanceSeriesDto } from '@patrimo/contracts';
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
      defaultValue: { period: '6M', count: 0, labels: [], portfolio: [], benchmark: null, drawdowns: [], annualized: null },
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

  private readonly etfStatsResource = httpResource<EtfStatsDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/performance/etf-stats` : undefined),
    { defaultValue: [] },
  );

  private readonly feesResource = httpResource<FeesYtdDto>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/performance/fees` : undefined),
    { defaultValue: { brokerageYtd: 0, terDragYtd: 0, totalYtd: 0, byEtf: [] } },
  );

  readonly etfStats     = this.etfStatsResource.value;
  readonly fees         = this.feesResource.value;
  readonly loadingStats = this.etfStatsResource.isLoading;
  readonly loadingFees  = this.feesResource.isLoading;

  setPeriod(period: PerformancePeriod): void { this.period.set(period); }
  reload(): void { this.resource.reload(); }
}
