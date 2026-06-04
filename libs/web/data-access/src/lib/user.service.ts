import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { MOCK_USER } from './mock-data';
import { User } from './models';

/** Derive [first, last] from a display name when Google omits `givenName`/`familyName`. */
function splitName(displayName: string): [string, string] {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return ['', ''];
  if (parts.length === 1) return [parts[0], ''];
  return [parts[0], parts.slice(1).join(' ')];
}

function computeInitials(firstName: string, lastName: string): string {
  const f = firstName.charAt(0).toUpperCase();
  const l = lastName.charAt(0).toUpperCase();
  return (f + l) || f || '?';
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly auth = inject(AuthService);

  readonly currentUser = computed<User | null>(() => {
    const a = this.auth.user();
    if (!a) return null;

    const [fallbackFirst, fallbackLast] = splitName(a.name ?? '');
    const firstName = a.firstName || fallbackFirst;
    const lastName  = a.lastName  || fallbackLast;
    const initials  = a.initials && a.initials !== '?'
      ? a.initials
      : computeInitials(firstName, lastName);

    return {
      firstName,
      lastName,
      initials,
      // TODO Sprint 2: replace with values returned by /api/users/me/preferences.
      riskProfile:     MOCK_USER.riskProfile,
      horizonYears:    MOCK_USER.horizonYears,
      monthlyTarget:   MOCK_USER.monthlyTarget,
      displayCurrency: MOCK_USER.displayCurrency,
    };
  });
}
