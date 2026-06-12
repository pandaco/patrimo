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
  allocationTargets: AllocationTargetsDto | null;
}

export type UpdateUserPreferencesDto = Partial<UserPreferencesDto>;
