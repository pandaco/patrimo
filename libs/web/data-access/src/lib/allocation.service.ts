import { Injectable, computed, inject } from '@angular/core';
import { MOCK_TARGETS } from './mock-data';
import { Targets } from './models';
import { PreferencesService } from './preferences.service';

@Injectable({ providedIn: 'root' })
export class AllocationService {
  private readonly preferences = inject(PreferencesService);

  readonly targets = computed<Targets>(() => {
    const stored = this.preferences.current().allocationTargets;
    if (!stored) return MOCK_TARGETS;
    return {
      strategic: stored.strategic,
      tactic:    stored.tactic,
      etf:       stored.etf,
      envelope:  stored.envelope ?? MOCK_TARGETS.envelope,
    };
  });
}
