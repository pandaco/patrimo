import { Inject, Injectable } from '@nestjs/common';
import type {
  AllocationTargets,
  UserPreferences,
  UserPreferencesRepository,
} from '@patrimo/api-domain';
import { UpdateUserPreferencesDto, UserPreferencesDto } from '@patrimo/contracts';
import { USER_PREFERENCES_REPOSITORY } from '@patrimo/infrastructure';

const DEFAULTS: UserPreferencesDto = {
  riskProfile:     'Équilibré dynamique',
  horizonYears:    25,
  monthlyTarget:   0,
  displayCurrency: 'EUR',
  uiMode:          'simple',
  onboardingDone:  false,
  allocationTargets: null,
};

function toDto(row: UserPreferences | null): UserPreferencesDto {
  if (!row) return { ...DEFAULTS };
  return {
    riskProfile:       row.riskProfile,
    horizonYears:      row.horizonYears,
    monthlyTarget:     row.monthlyTarget,
    displayCurrency:   row.displayCurrency,
    uiMode:            row.uiMode,
    onboardingDone:    row.onboardingDone,
    allocationTargets: row.allocationTargets,
  };
}

@Injectable()
export class PreferencesService {
  constructor(
    @Inject(USER_PREFERENCES_REPOSITORY) private readonly repo: UserPreferencesRepository,
  ) {}

  async get(userId: string): Promise<UserPreferencesDto> {
    return toDto(await this.repo.findByUserId(userId));
  }

  async update(userId: string, input: UpdateUserPreferencesDto): Promise<UserPreferencesDto> {
    // Coerce the incoming `allocationTargets` to the domain shape only when
    // the client actually sent it — otherwise leave the persisted value
    // untouched. Setting it explicitly to `null` clears it.
    const partial = {
      riskProfile:     input.riskProfile,
      horizonYears:    input.horizonYears,
      monthlyTarget:   input.monthlyTarget,
      displayCurrency: input.displayCurrency,
      uiMode:          input.uiMode,
      onboardingDone:  input.onboardingDone,
      allocationTargets: input.allocationTargets === undefined
        ? undefined
        : (input.allocationTargets as AllocationTargets | null),
    };
    return toDto(await this.repo.upsert(userId, partial));
  }
}
