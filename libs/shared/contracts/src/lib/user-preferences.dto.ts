export interface AllocationTargetsDto {
  strategic: { stocks: number; bonds: number };
  tactic:    { core: number; satellite: number; bonds: number };
  etf:       Record<string, number>;
  envelope?: Record<string, number>;
}

export type UiMode = 'simple' | 'expert';

export interface UserPreferencesDto {
  riskProfile:       string;
  horizonYears:      number;
  monthlyTarget:     number;
  displayCurrency:   string;
  uiMode:            UiMode;
  onboardingDone:    boolean;
  /** ISIN of the catalog ETF used as the performance benchmark. */
  benchmarkIsin:     string;
  /** Reference Livret A rate (%/yr) the dashboard compares the portfolio against. */
  livretRatePct:     number;
  allocationTargets: AllocationTargetsDto | null;
}

export type UpdateUserPreferencesDto = Partial<UserPreferencesDto>;
