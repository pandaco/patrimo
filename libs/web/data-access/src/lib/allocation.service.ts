import { Injectable, computed, inject } from '@angular/core';
import { MOCK_TARGETS } from './mock-data';
import { Targets } from './models';
import { PreferencesService } from './preferences.service';

@Injectable({ providedIn: 'root' })
export class AllocationService {
  private readonly preferences = inject(PreferencesService);

  /**
   * User-stored allocation targets when available, falling back to the
   * `MOCK_TARGETS` reference until the user picks their own. The fallback
   * keeps every consumer non-null so feature pages do not need to render an
   * empty-state for the targets card.
   */
  readonly targets = computed<Targets>(() => {
    const stored = this.preferences.current().allocationTargets;
    if (!stored) return MOCK_TARGETS;
    return {
      strategic: stored.strategic,
      tactic:    stored.tactic,
      etf:       stored.etf,
      envelope:  MOCK_TARGETS.envelope, // TODO: envelope targets land in the next pass.
    };
  });
}
