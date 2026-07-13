export type PerformancePeriod = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | '3Y' | '5Y' | 'MAX';

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
  /** Invested capital (cost basis of the holdings) per label — the "ce que tu as mis" line. */
  invested: number[];
  /** Top 3 drawdowns over the window, ranked by absolute depth. */
  drawdowns: DrawdownDto[];
  /** CAGR (annualized return) in %. `null` for sub-1-year periods. */
  annualized: number | null;
}

/**
 * Total + annualized portfolio return for one selectable period — one row of
 * the multi-period table. Computed with the exact same replay as
 * `PerformanceSeriesDto`, so a row always matches what the chart shows when
 * that period is active.
 */
export interface PeriodReturnDto {
  period: PerformancePeriod;
  /** Total return over the window in % (first non-zero sample → last). `null` when no position over the window. */
  totalPct: number | null;
  /** CAGR in %. `null` for windows shorter than a year. */
  annualizedPct: number | null;
}

export interface PerformanceMetricsDto {
  period: PerformancePeriod;
  /** True time-weighted return over the window, in % — flow-neutral performance. `null` if too few samples. */
  twr: number | null;
  /** Annualized volatility of daily returns, in %. */
  volatility: number | null;
  /** Sharpe ratio (annualized return / volatility, risk-free = 0). */
  sharpe: number | null;
  /** Sortino ratio (annualized return / downside deviation, risk-free = 0). */
  sortino: number | null;
  /** Worst peak-to-trough drawdown in the window, in % (negative). */
  maxDrawdownPct: number | null;
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

export type WealthCategory = 'bourse' | 'livret' | 'immo' | 'crypto' | 'metal' | 'cash';

/** Key for the period-return map: every category plus the `all` aggregate. */
export type WealthReturnKey = 'all' | WealthCategory;

export interface WealthReturnDto {
  /** Flow-adjusted euro gain over the period: value change minus contributions. */
  eur: number;
  /**
   * Time-weighted return in %, computed on a clean invested base (ETF market
   * value for boursier, balance for the rest) so contributions never inflate
   * it. The figure comparable to an index. `null` when too few clean steps.
   */
  twrPct: number | null;
  /**
   * Return on invested capital, in %: `eur ÷ (opening value + net contributions)`.
   * The intuitive "I put in X, I gained Y → Z %" figure — money-weighted but
   * untimed, so it stays stable across window lengths (unlike a time-weighted
   * Dietz, which explodes when capital is deployed late in a long window).
   * `null` when the invested base is too small to divide.
   */
  investedReturnPct: number | null;
  /** TWR extrapolated to a year, in %. `null` for windows shorter than ~1 year. */
  annualizedPct: number | null;
}

export interface WealthSeriesDto {
  period: PerformancePeriod;
  labels: string[];
  /** Total patrimoine across all categories. */
  total: number[];
  /**
   * Net external inflows per label day, summed across ALL envelopes:
   * sum(DEPOSIT) − sum(WITHDRAWAL). DIVIDEND and INTEREST are excluded — they
   * are returns, not external capital. BUY/SELL are excluded too — they move
   * cash inside an envelope, not in/out of the patrimoine. Use to strip
   * contribution noise from a period's return.
   */
  flows: number[];
  /**
   * Same as `flows` but split per category, so a category-filtered view can
   * strip only the contributions that belong to that category (a livret
   * deposit must not pollute the boursier return). Aligned to `labels`.
   */
  flowsByCategory: Partial<Record<WealthCategory, number[]>>;
  /** Per-category value series, each aligned to `labels`. Only categories with at least one envelope are present. */
  byCategory: Partial<Record<WealthCategory, number[]>>;
  /** Per-envelope value series keyed by envelope id, aligned to `labels`. */
  byEnvelope: Record<string, number[]>;
  /**
   * Period return per category plus the `all` aggregate, computed server-side
   * on a clean invested base (not the cash-inclusive chart series, which can
   * dip negative on unfunded buys and wreck a TWR). The UI just displays these.
   */
  returns: Partial<Record<WealthReturnKey, WealthReturnDto>>;
  /** Period return per envelope, keyed by envelope id — same clean-base computation as `returns`. */
  returnsByEnvelope: Record<string, WealthReturnDto>;
}

/**
 * One persisted end-of-day valuation (PP8). Unlike WealthSeriesDto, which is
 * recomputed on every request, snapshots are immutable history: they survive
 * transaction edits and price-source gaps.
 */
export interface WealthSnapshotDto {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Total patrimoine in EUR. */
  total: number;
  /** Value split by category on that day. */
  byCategory: Partial<Record<WealthCategory, number>>;
}

export interface FeesYtdDto {
  /** Sum of `fees` on all BUY/SELL transactions since Jan 1st. */
  brokerageYtd: number;
  /** (TER / 100) × position_value × (days_elapsed / 365) for all held ETFs — TER is in percent points. */
  terDragYtd:   number;
  totalYtd:     number;
  /** `ter` in percent points (0.15 = 0.15 %/yr). */
  byEtf: { ticker: string; name: string; ter: number; value: number; terDragYtd: number }[];
}
