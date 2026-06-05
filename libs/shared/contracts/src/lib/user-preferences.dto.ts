export interface AllocationTargetsDto {
  strategic: { stocks: number; bonds: number };
  tactic:    { core: number; satellite: number; bonds: number };
  etf:       Record<string, number>;
  envelope?: Record<string, number>;
}

export interface UserPreferencesDto {
  riskProfile:       string;
  horizonYears:      number;
  monthlyTarget:     number;
  displayCurrency:   string;
  allocationTargets: AllocationTargetsDto | null;
}

export type UpdateUserPreferencesDto = Partial<UserPreferencesDto>;
