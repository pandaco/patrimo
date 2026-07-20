import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UpdateUserPreferencesDto } from '@patrimo/contracts';
import { EtfService, PreferencesService } from '@patrimo/data-access';
import { API_BASE_URL } from '@patrimo/data-access';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const RISK_PROFILES = [
  'Prudent',
  'Équilibré',
  'Équilibré dynamique',
  'Dynamique',
  'Offensif',
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './general-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingsComponent {
  private readonly preferences  = inject(PreferencesService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  protected readonly clearingCache = signal(false);

  protected async clearCache(scope: 'market' | 'exposure' | 'all'): Promise<void> {
    if (this.clearingCache()) return;
    this.clearingCache.set(true);
    try {
      const url = scope === 'all' ? `${this.baseUrl}/portfolio/cache` : `${this.baseUrl}/portfolio/cache/${scope}`;
      await firstValueFrom(this.http.delete(url));
      alert('Le cache a été purgé avec succès.');
    } catch {
      alert('Erreur lors de la purge du cache.');
    } finally {
      this.clearingCache.set(false);
    }
  }

  protected readonly riskProfiles = RISK_PROFILES;
  protected readonly currencies   = CURRENCIES;
  protected readonly loading      = this.preferences.loading;
  protected readonly etfCatalog   = inject(EtfService).all;

  protected riskProfile     = signal('');
  protected horizonYears    = signal<number | null>(25);
  protected monthlyTarget   = signal<number | null>(0);
  protected displayCurrency = signal('EUR');
  protected uiMode          = signal<'simple' | 'expert' | ''>('');
  protected benchmarkIsin   = signal('');
  protected livretRatePct   = signal<number | null>(2.4);

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);
  protected readonly success    = signal(false);

  constructor() {
    effect(() => {
      const c = this.preferences.current();
      if (!this.riskProfile())     this.riskProfile.set(c.riskProfile);
      if (this.horizonYears() === 25 && c.horizonYears !== 25) this.horizonYears.set(c.horizonYears);
      if (!this.monthlyTarget() && c.monthlyTarget !== 0)      this.monthlyTarget.set(c.monthlyTarget);
      if (this.displayCurrency() === 'EUR' && c.displayCurrency !== 'EUR') this.displayCurrency.set(c.displayCurrency);
      if (!this.uiMode()) this.uiMode.set(c.uiMode);
      if (!this.benchmarkIsin()) this.benchmarkIsin.set(c.benchmarkIsin);
      if (this.livretRatePct() === 2.4 && c.livretRatePct !== 2.4) this.livretRatePct.set(c.livretRatePct);
    });
  }

  protected async save(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null);
    this.success.set(false);

    const payload: UpdateUserPreferencesDto = {
      riskProfile:       this.riskProfile().trim() || 'Équilibré dynamique',
      horizonYears:      Math.max(0, Math.min(100, Math.round(this.horizonYears() ?? 0))),
      monthlyTarget:     Math.max(0, this.monthlyTarget() ?? 0),
      displayCurrency:   this.displayCurrency(),
      uiMode:            this.uiMode() || 'simple',
      benchmarkIsin:     this.benchmarkIsin() || 'FR0010261198',
      livretRatePct:     Math.max(0, Math.min(20, this.livretRatePct() ?? 0)),
      allocationTargets: this.preferences.current().allocationTargets,
    };

    this.submitting.set(true);
    try {
      await this.preferences.update(payload);
      this.success.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      this.submitting.set(false);
    }
  }

  protected back(): void { this.router.navigateByUrl('/dashboard'); }
}
