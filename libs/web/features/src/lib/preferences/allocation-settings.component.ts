import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AllocationTargetsDto, UpdateUserPreferencesDto } from '@patrimo/contracts';
import { EnvelopeService, EtfService, PreferencesService } from '@patrimo/data-access';

interface EtfTargetRow { ticker: string; pct: number }
interface EnvTargetRow { glyph:  string; pct: number }

const DEFAULT_STRATEGIC = { stocks: 90, bonds: 10 };
const DEFAULT_TACTIC    = { core: 72, satellite: 18, bonds: 10 };

@Component({
  selector: 'app-allocation-settings',
  standalone: true,
  imports: [FormsModule, UpperCasePipe],
  templateUrl: './allocation-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationSettingsComponent {
  private readonly prefs  = inject(PreferencesService);
  private readonly etfSvc = inject(EtfService);
  private readonly envSvc = inject(EnvelopeService);
  private readonly router = inject(Router);

  protected readonly loading   = this.prefs.loading;
  protected readonly catalog   = this.etfSvc.all;
  protected readonly envelopes = this.envSvc.all;

  protected stocksPct      = signal(DEFAULT_STRATEGIC.stocks);
  protected bondsStratPct  = signal(DEFAULT_STRATEGIC.bonds);
  protected corePct        = signal(DEFAULT_TACTIC.core);
  protected satellitePct   = signal(DEFAULT_TACTIC.satellite);
  protected bondsTacticPct = signal(DEFAULT_TACTIC.bonds);

  protected etfTargets = signal<EtfTargetRow[]>([]);
  protected envTargets = signal<EnvTargetRow[]>([]);

  private hydrated = false;

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);
  protected readonly success    = signal(false);

  protected readonly strategicSum = computed(() => this.stocksPct() + this.bondsStratPct());
  protected readonly tacticSum    = computed(() => this.corePct() + this.satellitePct() + this.bondsTacticPct());
  protected readonly etfSum       = computed(() => this.etfTargets().reduce((a, r) => a + (r.pct || 0), 0));
  protected readonly envSum       = computed(() => this.envTargets().reduce((a, r) => a + (r.pct || 0), 0));

  constructor() {
    effect(() => {
      const current = this.prefs.current();
      if (!this.hydrated && current.allocationTargets) {
        const t = current.allocationTargets;
        this.stocksPct.set(t.strategic.stocks);
        this.bondsStratPct.set(t.strategic.bonds);
        this.corePct.set(t.tactic.core);
        this.satellitePct.set(t.tactic.satellite);
        this.bondsTacticPct.set(t.tactic.bonds);
        this.etfTargets.set(Object.entries(t.etf).map(([ticker, pct]) => ({ ticker, pct })));
        if (t.envelope) {
          this.envTargets.set(Object.entries(t.envelope).map(([glyph, pct]) => ({ glyph, pct })));
        }
        this.hydrated = true;
      }
    });

    effect(() => {
      const known  = new Set(this.etfTargets().map(r => r.ticker));
      const extras = this.catalog().filter(e => !known.has(e.ticker));
      if (extras.length > 0) {
        this.etfTargets.update(list => [...list, ...extras.map(e => ({ ticker: e.ticker, pct: 0 }))]);
      }
    });

    effect(() => {
      const known       = new Set(this.envTargets().map(r => r.glyph));
      const uniqueGlyphs = [...new Set(this.envelopes().map(e => e.glyph))];
      const extras = uniqueGlyphs.filter(g => !known.has(g));
      if (extras.length > 0) {
        this.envTargets.update(list => [...list, ...extras.map(g => ({ glyph: g, pct: 0 }))]);
      }
    });
  }

  protected setEtfPct(ticker: string, pct: number): void {
    this.etfTargets.update(list => list.map(r => r.ticker === ticker ? { ...r, pct } : r));
  }

  protected removeEtf(ticker: string): void {
    this.etfTargets.update(list => list.filter(r => r.ticker !== ticker));
  }

  protected setEnvPct(glyph: string, pct: number): void {
    this.envTargets.update(list => list.map(r => r.glyph === glyph ? { ...r, pct } : r));
  }

  protected removeEnv(glyph: string): void {
    this.envTargets.update(list => list.filter(r => r.glyph !== glyph));
  }

  protected async save(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null);
    this.success.set(false);

    if (Math.abs(this.strategicSum() - 100) > 0.01) {
      this.error.set('La cible stratégique doit sommer à 100 %.'); return;
    }
    if (Math.abs(this.tacticSum() - 100) > 0.01) {
      this.error.set('La cible tactique doit sommer à 100 %.'); return;
    }
    if (this.etfSum() > 0 && Math.abs(this.etfSum() - 100) > 0.01) {
      this.error.set('La cible ETF doit sommer à 100 % (ou être vide).'); return;
    }
    if (this.envSum() > 0 && Math.abs(this.envSum() - 100) > 0.01) {
      this.error.set('La cible enveloppe doit sommer à 100 % (ou être vide).'); return;
    }

    const allocationTargets: AllocationTargetsDto = {
      strategic: { stocks: this.stocksPct(), bonds: this.bondsStratPct() },
      tactic:    { core: this.corePct(), satellite: this.satellitePct(), bonds: this.bondsTacticPct() },
      etf:       Object.fromEntries(this.etfTargets().filter(r => r.pct > 0).map(r => [r.ticker, r.pct])),
      envelope:  Object.fromEntries(this.envTargets().filter(r => r.pct > 0).map(r => [r.glyph, r.pct])),
    };

    const c = this.prefs.current();
    const payload: UpdateUserPreferencesDto = {
      riskProfile:       c.riskProfile,
      horizonYears:      c.horizonYears,
      monthlyTarget:     c.monthlyTarget,
      displayCurrency:   c.displayCurrency,
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

  protected back(): void { this.router.navigateByUrl('/tools/allocation'); }
}
