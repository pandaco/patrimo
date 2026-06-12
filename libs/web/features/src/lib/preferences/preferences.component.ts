import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UpdateUserPreferencesDto } from '@patrimo/contracts';
import { EtfService, PreferencesService } from '@patrimo/data-access';

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
  imports: [FormsModule, RouterLink],
  templateUrl: './preferences.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesComponent {
  private readonly prefs  = inject(PreferencesService);
  private readonly router = inject(Router);

  protected readonly riskProfiles = RISK_PROFILES;
  protected readonly currencies   = CURRENCIES;
  protected readonly loading      = this.prefs.loading;
  protected readonly etfCatalog   = inject(EtfService).all;

  protected riskProfile     = signal('');
  protected horizonYears    = signal(25);
  protected monthlyTarget   = signal(0);
  protected displayCurrency = signal('EUR');
  protected uiMode          = signal<'simple' | 'expert' | ''>('');
  protected benchmarkIsin   = signal('');

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);
  protected readonly success    = signal(false);

  constructor() {
    effect(() => {
      const c = this.prefs.current();
      if (!this.riskProfile())     this.riskProfile.set(c.riskProfile);
      if (this.horizonYears() === 25 && c.horizonYears !== 25) this.horizonYears.set(c.horizonYears);
      if (!this.monthlyTarget() && c.monthlyTarget !== 0)      this.monthlyTarget.set(c.monthlyTarget);
      if (this.displayCurrency() === 'EUR' && c.displayCurrency !== 'EUR') this.displayCurrency.set(c.displayCurrency);
      if (!this.uiMode()) this.uiMode.set(c.uiMode);
      if (!this.benchmarkIsin()) this.benchmarkIsin.set(c.benchmarkIsin);
    });
  }

  protected async save(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null);
    this.success.set(false);

    const payload: UpdateUserPreferencesDto = {
      riskProfile:       this.riskProfile().trim() || 'Équilibré dynamique',
      horizonYears:      Math.max(0, Math.min(100, Math.round(this.horizonYears()))),
      monthlyTarget:     Math.max(0, this.monthlyTarget()),
      displayCurrency:   this.displayCurrency(),
      uiMode:            this.uiMode() || 'simple',
      benchmarkIsin:     this.benchmarkIsin() || 'FR0010261198',
      allocationTargets: this.prefs.current().allocationTargets,
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

  protected back(): void { this.router.navigateByUrl('/dashboard'); }
}
