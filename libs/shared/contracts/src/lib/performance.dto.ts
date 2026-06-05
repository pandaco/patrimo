export type PerformancePeriod = '1M' | '3M' | '6M' | '1Y' | 'YTD' | '3Y' | '5Y' | 'MAX';

export interface DrawdownDto {
  /** ISO date of the most recent local peak before the dip. */
  peakDate: string;
  /** ISO date of the lowest point reached during the dip. */
  troughDate: string;
  /** ISO date the curve crossed back above the peak. `null` when still under water at the end of the window. */
  recoveryDate: string | null;
  /** Negative percentage (peak → trough). */
  pct: number;
  /** Number of days from peak to trough. */
  durationDays: number;
  /** Number of days from trough to recovery. `null` when not yet recovered. */
  recoveryDays: number | null;
}

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
  /** Top 3 drawdowns over the window, ranked by absolute depth. */
  drawdowns: DrawdownDto[];
  /** CAGR (annualized return) in %. `null` for sub-1-year periods. */
  annualized: number | null;
}

export interface EtfStatsDto {
  ticker:    string;
  name:      string;
  /** Tracking difference (fund 1Y return − CW8 1Y return), in %. */
  td:        number | null;
  /** Tracking error (annualized std dev of daily return diff vs CW8), in %. */
  te:        number | null;
  /** Fund 1-year total return in %. */
  return1y:  number | null;
}

export interface FeesYtdDto {
  /** Sum of `fees` on all BUY/SELL transactions since Jan 1st. */
  brokerageYtd: number;
  /** TER × position_value × (days_elapsed / 365) for all held ETFs. */
  terDragYtd:   number;
  totalYtd:     number;
  byEtf: { ticker: string; name: string; ter: number; value: number; terDragYtd: number }[];
}
