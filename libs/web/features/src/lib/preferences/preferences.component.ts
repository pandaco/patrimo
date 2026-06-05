import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AllocationTargetsDto, UpdateUserPreferencesDto } from 'contracts';
import { EtfService, PreferencesService } from 'data-access';

const RISK_PROFILES = [
  'Prudent',
  'Équilibré',
  'Équilibré dynamique',
  'Dynamique',
  'Offensif',
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;

interface EtfTargetRow { ticker: string; pct: number }

const DEFAULT_STRATEGIC = { stocks: 90, bonds: 10 };
const DEFAULT_TACTIC    = { core: 72, satellite: 18, bonds: 10 };

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './preferences.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesComponent {
  private readonly prefs  = inject(PreferencesService);
  private readonly etfSvc = inject(EtfService);
  private readonly router = inject(Router);

  protected readonly riskProfiles = RISK_PROFILES;
  protected readonly currencies   = CURRENCIES;

  protected readonly loading      = this.prefs.loading;
  protected readonly catalog      = this.etfSvc.all;

  protected riskProfile     = signal('');
  protected horizonYears    = signal(25);
  protected monthlyTarget   = signal(0);
  protected displayCurrency = signal('EUR');

  protected stocksPct      = signal(DEFAULT_STRATEGIC.stocks);
  protected bondsStratPct  = signal(DEFAULT_STRATEGIC.bonds);
  protected corePct        = signal(DEFAULT_TACTIC.core);
  protected satellitePct   = signal(DEFAULT_TACTIC.satellite);
  protected bondsTacticPct = signal(DEFAULT_TACTIC.bonds);

  /** Editable list of per-ETF target weights. Always pre-seeded from the catalog. */
  protected etfTargets = signal<EtfTargetRow[]>([]);

  private hydrated = false;

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);
  protected readonly success    = signal(false);

  protected readonly strategicSum = computed(() => this.stocksPct() + this.bondsStratPct());
  protected readonly tacticSum    = computed(() => this.corePct() + this.satellitePct() + this.bondsTacticPct());
  protected readonly etfSum       = computed(() => this.etfTargets().reduce((a, r) => a + (r.pct || 0), 0));

  constructor() {
    effect(() => {
      const current = this.prefs.current();
      if (!this.riskProfile())     this.riskProfile.set(current.riskProfile);
      if (this.horizonYears() === 25 && current.horizonYears !== 25)   this.horizonYears.set(current.horizonYears);
      if (!this.monthlyTarget() && current.monthlyTarget !== 0)        this.monthlyTarget.set(current.monthlyTarget);
      if (this.displayCurrency() === 'EUR' && current.displayCurrency !== 'EUR') this.displayCurrency.set(current.displayCurrency);

      if (!this.hydrated && current.allocationTargets) {
        const t = current.allocationTargets;
        this.stocksPct.set(t.strategic.stocks);
        this.bondsStratPct.set(t.strategic.bonds);
        this.corePct.set(t.tactic.core);
        this.satellitePct.set(t.tactic.satellite);
        this.bondsTacticPct.set(t.tactic.bonds);
        this.etfTargets.set(Object.entries(t.etf).map(([ticker, pct]) => ({ ticker, pct })));
        this.hydrated = true;
      }
    });

    // Once the ETF catalog hydrates, seed any tickers not yet in the saved
    // targets at 0 % so the user can edit them inline without an extra "add"
    // click. Removing a row is still allowed via the trash button.
    effect(() => {
      const known = new Set(this.etfTargets().map(r => r.ticker));
      const extras = this.catalog().filter(e => !known.has(e.ticker));
      if (extras.length > 0) {
        this.etfTargets.update(list => [...list, ...extras.map(e => ({ ticker: e.ticker, pct: 0 }))]);
      }
    });
  }

  protected setEtfPct(ticker: string, pct: number): void {
    this.etfTargets.update(list => list.map(r => r.ticker === ticker ? { ...r, pct } : r));
  }

  protected removeEtf(ticker: string): void {
    this.etfTargets.update(list => list.filter(r => r.ticker !== ticker));
  }

  protected async save(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null);
    this.success.set(false);

    if (Math.abs(this.strategicSum() - 100) > 0.01) {
      this.error.set('La cible stratégique doit sommer à 100 %.');
      return;
    }
    if (Math.abs(this.tacticSum() - 100) > 0.01) {
      this.error.set('La cible tactique doit sommer à 100 %.');
      return;
    }
    if (this.etfSum() > 0 && Math.abs(this.etfSum() - 100) > 0.01) {
      this.error.set('La cible ETF doit sommer à 100 % (ou être vide).');
      return;
    }

    const allocationTargets: AllocationTargetsDto = {
      strategic: { stocks: this.stocksPct(), bonds: this.bondsStratPct() },
      tactic:    {
        core:      this.corePct(),
        satellite: this.satellitePct(),
        bonds:     this.bondsTacticPct(),
      },
      etf: Object.fromEntries(
        this.etfTargets()
          .filter(r => r.pct > 0)
          .map(r => [r.ticker, r.pct]),
      ),
    };

    const payload: UpdateUserPreferencesDto = {
      riskProfile:     this.riskProfile().trim() || 'Équilibré dynamique',
      horizonYears:    Math.max(0, Math.min(100, Math.round(this.horizonYears()))),
      monthlyTarget:   Math.max(0, this.monthlyTarget()),
      displayCurrency: this.displayCurrency(),
      allocationTargets,
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
