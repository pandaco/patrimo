export interface UserPreferences {
  userId: string;
  riskProfile:     string;
  horizonYears:    number;
  monthlyTarget:   number;
  displayCurrency: string;
  /** Sidebar density: 'simple' shows the beginner nav, 'expert' the full one. */
  uiMode:          'simple' | 'expert';
  /** True once the user completed (or skipped) the welcome flow. */
  onboardingDone:  boolean;
  /** ISIN of the catalog ETF used as the performance benchmark. */
  benchmarkIsin:   string;
  /** Reference Livret A rate (%/yr) the dashboard compares the portfolio against. */
  livretRatePct:   number;
  /** Optional allocation targets (strategic/tactic/etf). `null` while the user has not set them. */
  allocationTargets: AllocationTargets | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AllocationTargets {
  strategic: { stocks: number; bonds: number };
  tactic:    { core: number; satellite: number; bonds: number };
  etf:       Record<string, number>;
  envelope?: Record<string, number>;
}

export type UserPreferencesSeed = Omit<UserPreferences, 'createdAt' | 'updatedAt'>;
