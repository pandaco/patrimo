export interface UserPreferences {
  userId: string;
  riskProfile:     string;
  horizonYears:    number;
  monthlyTarget:   number;
  displayCurrency: string;
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
