import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { AllocationTargetsDto, UpdateUserPreferencesDto } from '@patrimo/contracts';
import { EnvelopeService, EtfService, PreferencesService } from '@patrimo/data-access';
import { EtfDialogComponent } from '@patrimo/ui';

interface EtfTargetRow { ticker: string; pct: number }
interface EnvTargetRow { glyph:  string; pct: number }

const DEFAULT_STRATEGIC = { stocks: 90, bonds: 10 };
const DEFAULT_TACTIC    = { core: 72, satellite: 18, bonds: 10 };

// Suggested equity share per risk profile (the bonds share is the remainder).
// A starting point, not advice — the user can override every number.
const RISK_STOCKS: Record<string, number> = {
  'Prudent':             35,
  'Équilibré':           55,
  'Équilibré dynamique': 70,
  'Dynamique':           85,
  'Offensif':            95,
};

type WizardStepId = 1 | 2 | 3 | 4;
interface WizardStep { id: WizardStepId; label: string; hint: string }

/** In-progress wizard state, parked in sessionStorage so a refresh or crash
 *  mid-wizard does not wipe the four steps. Dies with the tab. */
interface WizardDraft {
  step: WizardStepId;
  stocksPct: number;
  bondsStratPct: number;
  corePct: number;
  satellitePct: number;
  bondsTacticPct: number;
  etfTargets: EtfTargetRow[];
  envTargets: EnvTargetRow[];
}

const DRAFT_STORAGE_KEY = 'allocation-wizard:draft';
const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Stratégique', hint: 'Actions vs Obligations'        },
  { id: 2, label: 'Tactique',    hint: 'Core / Satellite / Obligations' },
  { id: 3, label: 'Par ETF',     hint: 'Poids cible par ligne'          },
  { id: 4, label: 'Par enveloppe', hint: 'Répartition par contenant'    },
];

@Component({
  selector: 'app-allocation-settings',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, RouterLink],
  templateUrl: './allocation-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationSettingsComponent {
  private readonly preferences  = inject(PreferencesService);
  private readonly etfService = inject(EtfService);
  private readonly envelopeService = inject(EnvelopeService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly loading   = this.preferences.loading;
  protected readonly catalog   = this.etfService.all;
  protected readonly envelopes = this.envelopeService.all;

  protected readonly riskProfile = computed(() => this.preferences.current().riskProfile);

  /** Suggested strategic split from the user's risk profile, nudged by horizon. */
  protected readonly suggestedStocks = computed(() => {
    let base = RISK_STOCKS[this.riskProfile()] ?? 70;
    const horizon = this.preferences.current().horizonYears;
    if (horizon >= 20)     base += 5;   // long horizon → can ride more volatility
    else if (horizon < 8)  base -= 15;  // short horizon → de-risk
    base = Math.max(0, Math.min(100, base));
    return Math.round(base / 5) * 5;
  });
  protected readonly suggestedBonds = computed(() => 100 - this.suggestedStocks());

  /** Suggested tactic from the current strategic split: Core = 80% of equities. */
  protected readonly suggestedTactic = computed(() => {
    const stocks = this.stocksPct();
    const core = Math.round(stocks * 0.8);
    return { core, satellite: stocks - core, bonds: this.bondsStratPct() };
  });

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

  protected readonly steps    = WIZARD_STEPS;
  protected readonly step     = signal<WizardStepId>(1);
  protected readonly isLast   = computed(() => this.step() === WIZARD_STEPS[WIZARD_STEPS.length - 1].id);

  protected readonly stepValid = computed(() => {
    switch (this.step()) {
      case 1: return Math.abs(this.strategicSum() - 100) < 0.01;
      case 2: return Math.abs(this.tacticSum() - 100) < 0.01;
      case 3: return this.etfSum() === 0 || Math.abs(this.etfSum() - 100) < 0.01;
      case 4: return this.envSum() === 0 || Math.abs(this.envSum() - 100) < 0.01;
    }
  });

  protected readonly stepStatus = computed(() => {
    const current = this.step();
    return WIZARD_STEPS.map(s => ({
      ...s,
      state: s.id < current ? 'done' : s.id === current ? 'current' : 'todo',
    }));
  });

  constructor() {
    // Resume an interrupted session (refresh, crash) before the server
    // preferences hydrate — the draft wins over the persisted targets.
    const storedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (storedDraft !== null) {
      try {
        const draft: WizardDraft = JSON.parse(storedDraft);
        this.stocksPct.set(draft.stocksPct);
        this.bondsStratPct.set(draft.bondsStratPct);
        this.corePct.set(draft.corePct);
        this.satellitePct.set(draft.satellitePct);
        this.bondsTacticPct.set(draft.bondsTacticPct);
        this.etfTargets.set(draft.etfTargets ?? []);
        this.envTargets.set(draft.envTargets ?? []);
        this.step.set(draft.step ?? 1);
        this.hydrated = true;
      } catch {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }

    // Park every subsequent change as the draft. The first run only takes the
    // baseline snapshot: an untouched visit must not shadow the saved targets.
    let baselineSnapshot: string | null = null;
    effect(() => {
      const snapshot = JSON.stringify({
        step: this.step(),
        stocksPct: this.stocksPct(),
        bondsStratPct: this.bondsStratPct(),
        corePct: this.corePct(),
        satellitePct: this.satellitePct(),
        bondsTacticPct: this.bondsTacticPct(),
        etfTargets: this.etfTargets(),
        envTargets: this.envTargets(),
      } satisfies WizardDraft);
      if (baselineSnapshot === null) { baselineSnapshot = snapshot; return; }
      if (snapshot !== baselineSnapshot) sessionStorage.setItem(DRAFT_STORAGE_KEY, snapshot);
    });

    effect(() => {
      const current = this.preferences.current();
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

  protected applyStrategicSuggestion(): void {
    this.stocksPct.set(this.suggestedStocks());
    this.bondsStratPct.set(this.suggestedBonds());
  }

  protected applyTacticSuggestion(): void {
    const s = this.suggestedTactic();
    this.corePct.set(s.core);
    this.satellitePct.set(s.satellite);
    this.bondsTacticPct.set(s.bonds);
  }

  /** Open the Yahoo-backed add-ETF dialog; the new line joins the catalog and,
   *  via the catalog effect, appears in the ETF target list automatically. */
  protected openAddEtf(): void {
    this.dialog.open(EtfDialogComponent, { panelClass: 'transaction-dialog-panel', maxWidth: 'min(580px, calc(100vw - 24px))', width: '100%' });
  }

  /** Split 100 % evenly across the listed ETFs (remainder on the first row). */
  protected distributeEtfEvenly(): void {
    const rows = this.etfTargets();
    if (rows.length === 0) return;
    const base = Math.floor(100 / rows.length);
    const remainder = 100 - base * rows.length;
    this.etfTargets.set(rows.map((r, i) => ({ ...r, pct: base + (i === 0 ? remainder : 0) })));
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

    const c = this.preferences.current();
    const payload: UpdateUserPreferencesDto = {
      riskProfile:       c.riskProfile,
      horizonYears:      c.horizonYears,
      monthlyTarget:     c.monthlyTarget,
      displayCurrency:   c.displayCurrency,
      allocationTargets,
    };

    this.submitting.set(true);
    try {
      await this.preferences.update(payload);
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      this.success.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      this.submitting.set(false);
    }
  }

  protected back(): void { this.router.navigateByUrl('/tools/allocation'); }

  protected next(): void {
    if (!this.stepValid()) return;
    const current = this.step();
    if (current < WIZARD_STEPS.length) this.step.set((current + 1) as WizardStepId);
  }

  protected prev(): void {
    const current = this.step();
    if (current > 1) this.step.set((current - 1) as WizardStepId);
  }

  protected goTo(id: WizardStepId): void {
    // Allow jumping to any previously-visited step or the next one if current is valid.
    if (id <= this.step()) { this.step.set(id); return; }
    if (this.stepValid() && id === this.step() + 1) this.step.set(id);
  }
}
