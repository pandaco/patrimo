export type PerformancePeriod = '1M' | '3M' | '6M' | '1Y' | 'YTD';

export interface PerformanceSeriesDto {
  /** Period that the series was computed for. */
  period: PerformancePeriod;
  /** Number of daily samples returned. */
  count: number;
  /** ISO `YYYY-MM-DD` labels — one per sample. */
  labels: string[];
  /** Portfolio total value, one euro figure per label. */
  portfolio: number[];
  /** Daily benchmark index normalised to 100 on the first sample (`null` until wired). */
  benchmark: number[] | null;
}
