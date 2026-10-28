import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { EtfStatsDto, FeesYtdDto, PerformanceMetricsDto, PerformancePeriod, PerformanceSeriesDto, PeriodReturnDto, PeriodVariationDto, WealthSeriesDto } from '@patrimo/contracts';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
import { PeriodService } from './period.service';
import { safeValue, safeValueOrUndefined } from './safe';

const EMPTY_VARIATION: PeriodVariationDto = {
  period: 'YTD',
  total: { value: 0, pnl: 0, pnlPct: null, variation: 0, variationPct: null },
  positionsTotal: { value: 0, pnl: 0, pnlPct: null, variation: 0, variationPct: null },
  positions: [],
  envelopes: [],
};

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);
  private readonly periodService = inject(PeriodService);

  /** Shared period every resource below fetches for — owned by `PeriodService`. */
  readonly period = this.periodService.period;

  private readonly resource = httpResource<PerformanceSeriesDto>(
    () => (this.auth.isAuthenticated()
      ? `${this.baseUrl}/performance/series?period=${this.period()}`
      : undefined),
    {
      defaultValue: { period: '6M', count: 0, labels: [], portfolio: [], benchmark: null, invested: [], drawdowns: [], annualized: null },
    },
  );

  /** Risk + flow-neutral return metrics, refetched whenever the period changes. */
  private readonly metricsResource = httpResource<PerformanceMetricsDto>(
    () => (this.auth.isAuthenticated()
      ? `${this.baseUrl}/performance/metrics?period=${this.period()}`
      : undefined),
    {
      defaultValue: { period: '6M', twr: null, volatility: null, sharpe: null, sortino: null, maxDrawdownPct: null },
    },
  );

  readonly metrics        = computed(() => safeValue(this.metricsResource, { period: '6M', twr: null, volatility: null, sharpe: null, sortino: null, maxDrawdownPct: null }));
  readonly loadingMetrics = this.metricsResource.isLoading;

  /**
   * Legacy view used by the dashboard's `PerfChartComponent`: a `{ portfolio,
   * benchmark }` object. Keep the same shape the chart expects so its math
   * does not need to change — the data feeding it is now real.
   */
  readonly series = computed(() => {
    const dto = safeValueOrUndefined(this.resource);
    if (!dto) return { portfolio: [], benchmark: [] };
    return {
      portfolio: dto.portfolio,
      benchmark: dto.benchmark ?? [],
    };
  });

  readonly raw     = computed(() => safeValue(this.resource, { period: '6M', count: 0, labels: [], portfolio: [], benchmark: null, invested: [], drawdowns: [], annualized: null }));
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  readonly wealthPeriod = this.periodService.period;

  private readonly wealthResource = httpResource<WealthSeriesDto>(
    () => (this.auth.isAuthenticated()
      ? `${this.baseUrl}/performance/wealth-series?period=${this.wealthPeriod()}`
      : undefined),
    {
      defaultValue: { period: '1M', labels: [], total: [], flows: [], flowsByCategory: {}, byCategory: {}, byEnvelope: {}, returns: {}, returnsByEnvelope: {} },
    },
  );

  readonly wealth        = computed(() => safeValue(this.wealthResource, { period: '1M', labels: [], total: [], flows: [], flowsByCategory: {}, byCategory: {}, byEnvelope: {}, returns: {}, returnsByEnvelope: {} }));
  readonly wealthLoading = this.wealthResource.isLoading;

  private readonly etfStatsResource = httpResource<EtfStatsDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/performance/etf-stats` : undefined),
    { defaultValue: [] },
  );

  private readonly feesResource = httpResource<FeesYtdDto>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/performance/fees` : undefined),
    { defaultValue: { brokerageYtd: 0, terDragYtd: 0, totalYtd: 0, byEtf: [] } },
  );

  /** One total-return figure per selectable period — feeds the multi-period table. */
  private readonly periodReturnsResource = httpResource<PeriodReturnDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/performance/period-returns` : undefined),
    { defaultValue: [] },
  );

  readonly etfStats     = computed(() => safeValue(this.etfStatsResource, [] as EtfStatsDto[]));
  readonly fees         = computed(() => safeValue(this.feesResource, { brokerageYtd: 0, terDragYtd: 0, totalYtd: 0, byEtf: [] }));
  readonly loadingStats = this.etfStatsResource.isLoading;
  readonly loadingFees  = this.feesResource.isLoading;
  readonly periodReturns        = computed(() => safeValue(this.periodReturnsResource, [] as PeriodReturnDto[]));
  readonly loadingPeriodReturns = this.periodReturnsResource.isLoading;

  /**
   * Market variation (excluding contributions) of every position and envelope
   * over the shared period. `httpResource` resets `value()` to the default during
   * a re-fetch, so `variationHeld` keeps the last non-empty payload for the UI
   * to dim instead of flashing empty.
   */
  private readonly variationResource = httpResource<PeriodVariationDto>(
    () => (this.auth.isAuthenticated()
      ? `${this.baseUrl}/performance/variation?period=${this.period()}`
      : undefined),
    { defaultValue: EMPTY_VARIATION },
  );

  readonly variation        = computed(() => safeValue(this.variationResource, EMPTY_VARIATION));
  readonly variationLoading = this.variationResource.isLoading;
  readonly variationHeld    = linkedSignal<PeriodVariationDto, PeriodVariationDto>({
    source: this.variation,
    computation: (next, previous) =>
      next.positions.length > 0 || next.envelopes.length > 0 ? next : (previous?.value ?? next),
  });

  setPeriod(period: PerformancePeriod): void { this.periodService.set(period); }
  reload(): void { this.resource.reload(); }
}
