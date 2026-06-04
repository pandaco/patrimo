import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { MOCK_USER } from './mock-data';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly auth = inject(AuthService);

  readonly currentUser = computed<User | null>(() => {
    const a = this.auth.user();
    if (!a) return null;
    return {
      firstName: a.firstName || MOCK_USER.firstName,
      lastName:  a.lastName  || MOCK_USER.lastName,
      initials:  a.initials  || MOCK_USER.initials,
      // TODO Sprint 2: load these from /api/users/me/preferences
      riskProfile:     MOCK_USER.riskProfile,
      horizonYears:    MOCK_USER.horizonYears,
      monthlyTarget:   MOCK_USER.monthlyTarget,
      displayCurrency: MOCK_USER.displayCurrency,
    };
  });
}
