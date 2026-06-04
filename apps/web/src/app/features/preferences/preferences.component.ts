import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UpdateUserPreferencesDto } from 'contracts';
import { PreferencesService } from 'data-access';

const RISK_PROFILES = [
  'Prudent',
  'Équilibré',
  'Équilibré dynamique',
  'Dynamique',
  'Offensif',
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './preferences.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesComponent {
  private readonly prefs  = inject(PreferencesService);
  private readonly router = inject(Router);

  protected readonly riskProfiles = RISK_PROFILES;
  protected readonly currencies   = CURRENCIES;

  protected readonly loading = this.prefs.loading;

  protected riskProfile     = signal('');
  protected horizonYears    = signal(25);
  protected monthlyTarget   = signal(0);
  protected displayCurrency = signal('EUR');

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);
  protected readonly success    = signal(false);

  constructor() {
    // Sync the form signals with the resource value whenever it changes
    // (initial load, an external reload, …) without overriding values the
    // user has already started typing during the same render frame.
    effect(() => {
      const current = this.prefs.current();
      if (!this.riskProfile())     this.riskProfile.set(current.riskProfile);
      if (this.horizonYears() === 25 && current.horizonYears !== 25)   this.horizonYears.set(current.horizonYears);
      if (!this.monthlyTarget() && current.monthlyTarget !== 0)        this.monthlyTarget.set(current.monthlyTarget);
      if (this.displayCurrency() === 'EUR' && current.displayCurrency !== 'EUR') this.displayCurrency.set(current.displayCurrency);
    });
  }

  protected async save(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null);
    this.success.set(false);

    const payload: UpdateUserPreferencesDto = {
      riskProfile:     this.riskProfile().trim() || 'Équilibré dynamique',
      horizonYears:    Math.max(0, Math.min(100, Math.round(this.horizonYears()))),
      monthlyTarget:   Math.max(0, this.monthlyTarget()),
      displayCurrency: this.displayCurrency(),
    };

    this.submitting.set(true);
    try {
      await this.prefs.update(payload);
      this.success.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      this.submitting.set(false);
    }
  }

  protected back(): void {
    this.router.navigateByUrl('/dashboard');
  }
}
