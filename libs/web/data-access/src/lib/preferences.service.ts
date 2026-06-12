import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { UpdateUserPreferencesDto, UserPreferencesDto } from '@patrimo/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';

const DEFAULTS: UserPreferencesDto = {
  riskProfile:     'Équilibré dynamique',
  horizonYears:    25,
  monthlyTarget:   0,
  displayCurrency: 'EUR',
  uiMode:          'simple',
  onboardingDone:  true, // pessimistic until the real prefs load — avoids a welcome-flow flash
  allocationTargets: null,
};

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<UserPreferencesDto>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/users/me/preferences` : undefined),
    { defaultValue: DEFAULTS },
  );

  readonly current = this.resource.value;
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  readonly hasAllocationTargets = computed(() => this.current().allocationTargets !== null);

  reload(): void { this.resource.reload(); }

  async update(input: UpdateUserPreferencesDto): Promise<UserPreferencesDto> {
    const updated = await firstValueFrom(
      this.http.put<UserPreferencesDto>(`${this.baseUrl}/users/me/preferences`, input),
    );
    this.resource.update(() => updated);
    return updated;
  }
}
