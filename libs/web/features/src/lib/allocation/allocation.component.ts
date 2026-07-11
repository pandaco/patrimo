import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  AllocationService, API_BASE_URL, EnvelopeService, EtfService, etfValue, FxService,
  PreferencesService, StrategyVersionService, ToastService,
} from '@patrimo/data-access';
import { AllocationTargetsDto, RebalancePlanDto, StrategyVersionDto } from '@patrimo/contracts';
import { DeltaComponent, DonutComponent, TermComponent, TipDirective, fmtNum, fmtPct } from '@patrimo/ui';

interface SliceRow { label: string; value: number; pct: number; color: string }

interface EnvelopeTargetRow {
  glyph:  string;
  label:  string;
  target: number;
  real:   number;
  drift:  number;
}

type AllocBucket = 'Core' | 'Satellite' | 'Obligations' | 'Matières premières';

interface StrategyVersionRow {
  id:      string;
  label:   string;
  date:    string;
  desc:    string;
  current: boolean;
}

const VERSION_DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Human one-liner derived from a snapshot's tactic split. */
function describeTargets(targets: AllocationTargetsDto): string {
  const t = targets.tactic;
  return `Core ${t.core}% / Satellite ${t.satellite}% / Oblig ${t.bonds}%`;
}

const CURRENCY_COLORS: Record<string, string> = {
  EUR: '#16A34A',
  USD: '#0284C7',
  GBP: '#7C3AED',
};

@Component({
  selector: 'app-allocation',
  standalone: true,
  imports: [RouterLink, DeltaComponent, DonutComponent, TermComponent, TipDirective],
  templateUrl: './allocation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationComponent {
  private readonly allocationService = inject(AllocationService);
  private readonly etfService   = inject(EtfService);
  private readonly envelopeService = inject(EnvelopeService);
  private readonly strategyVersionService = inject(StrategyVersionService);
  private readonly preferences  = inject(PreferencesService);
  private readonly toast    = inject(ToastService);
  private readonly http     = inject(HttpClient);
  private readonly baseUrl  = inject(API_BASE_URL);

  protected readonly rebalancePlan      = signal<RebalancePlanDto | null>(null);
  protected readonly loadingRebalance   = signal(false);
  protected readonly savingVersion      = signal(false);
  /** Currently expanded version row, by id (null = none). */
  protected readonly selectedStrategyV  = signal<string | null>(null);

  /** Version-history rows from the backend; newest first, first row = active. */
  protected readonly strategyVersions = computed<StrategyVersionRow[]>(() =>
    this.strategyVersionService.all().map((v: StrategyVersionDto, i) => ({
      id:      v.id,
      label:   v.label,
      date:    VERSION_DATE_FMT.format(new Date(v.createdAt)),
      desc:    v.note?.trim() || describeTargets(v.targets),
      current: i === 0,
    })),
  );

  /** A version can only be saved once the user has defined allocation targets. */
  protected readonly canSaveVersion = computed(() => this.preferences.hasAllocationTargets());

  protected async saveVersion(): Promise<void> {
    if (this.savingVersion() || !this.canSaveVersion()) return;
    this.savingVersion.set(true);
    try {
      await this.strategyVersionService.create({});
      this.toast.success('Version de stratégie enregistrée');
    } catch {
      this.toast.error('Échec de l’enregistrement de la version');
    } finally {
      this.savingVersion.set(false);
    }
  }

  protected async deleteVersion(id: string): Promise<void> {
    try {
      await this.strategyVersionService.remove(id);
      if (this.selectedStrategyV() === id) this.selectedStrategyV.set(null);
      this.toast.success('Version supprimée');
    } catch {
      this.toast.error('Échec de la suppression');
    }
  }

  protected toggleVersion(id: string): void {
    this.selectedStrategyV.update(curr => (curr === id ? null : id));
  }

  protected readonly targets = this.allocationService.targets;

  protected readonly total = computed(() =>
    this.etfService.all().reduce((a, e) => a + etfValue(e), 0),
  );

  protected readonly realPct = computed(() => {
    const total = this.total();
    const m: Record<string, number> = {};
    if (!total) return m;
    for (const e of this.etfService.all()) m[e.ticker] = (etfValue(e) / total) * 100;
    return m;
  });

  protected readonly tacticReal = computed<Record<AllocBucket, number>>(() => {
    const total = this.total();
    const acc: Record<AllocBucket, number> = { Core: 0, Satellite: 0, Obligations: 0, 'Matières premières': 0 };
    if (!total) return acc;
    for (const e of this.etfService.all()) acc[e.alloc] += etfValue(e);
    return {
      Core:                 (acc.Core                 / total) * 100,
      Satellite:            (acc.Satellite            / total) * 100,
      Obligations:          (acc.Obligations          / total) * 100,
      'Matières premières': (acc['Matières premières'] / total) * 100,
    };
  });

  protected readonly strategicReal = computed(() => {
    const t = this.tacticReal();
    return { stocks: t.Core + t.Satellite + t['Matières premières'], bonds: t.Obligations };
  });

  protected readonly byCurrency = computed<SliceRow[]>(() => {
    const total = this.total();
    if (!total) return [];
    const acc = new Map<string, number>();
    for (const e of this.etfService.all()) {
      acc.set(e.currency, (acc.get(e.currency) ?? 0) + etfValue(e));
    }
    return Array.from(acc.entries())
      .map(([label, value]) => ({
        label,
        value,
        pct: (value / total) * 100,
        color: CURRENCY_COLORS[label] ?? '#5C5A53',
      }))
      .sort((a, b) => b.value - a.value);
  });

  protected readonly currencyDonut = computed(() =>
    this.byCurrency().map(s => ({ value: s.value, color: s.color, label: s.label, unit: '€' })),
  );

  protected readonly etfsWithTargets = computed(() =>
    this.etfService.all().filter(e => this.targets().etf[e.ticker] != null),
  );

  /**
   * Real vs target weight per envelope family (glyph), against total wealth —
   * the envelope target covers the whole patrimoine, not just the ETF lines.
   * Empty when the user has not set the envelope sub-targets yet.
   */
  protected readonly envelopeTargetRows = computed<EnvelopeTargetRow[]>(() => {
    const targetByGlyph = this.targets().envelope ?? {};
    if (Object.keys(targetByGlyph).length === 0) return [];

    const envelopes = this.envelopeService.all();
    const wealthTotal = envelopes.reduce((a, e) => a + e.value, 0);
    const valueByGlyph = new Map<string, number>();
    const labelByGlyph = new Map<string, string>();
    for (const envelope of envelopes) {
      valueByGlyph.set(envelope.glyph, (valueByGlyph.get(envelope.glyph) ?? 0) + envelope.value);
      if (!labelByGlyph.has(envelope.glyph)) labelByGlyph.set(envelope.glyph, envelope.label);
    }

    const glyphs = new Set([...Object.keys(targetByGlyph), ...valueByGlyph.keys()]);
    return [...glyphs]
      .map(glyph => {
        const target = targetByGlyph[glyph] ?? 0;
        const real = wealthTotal > 0 ? ((valueByGlyph.get(glyph) ?? 0) / wealthTotal) * 100 : 0;
        return {
          glyph,
          label: labelByGlyph.get(glyph) ?? glyph.toUpperCase(),
          target,
          real,
          drift: real - target,
        };
      })
      .sort((a, b) => b.target - a.target);
  });

  protected readonly strategicDonut = computed(() => [
    { value: this.targets().strategic.stocks, color: 'var(--brand)',  label: 'Actions',     unit: '%' },
    { value: this.targets().strategic.bonds,  color: 'var(--ink-3)',  label: 'Obligations', unit: '%' },
  ]);

  protected readonly tacticDonut = computed(() => [
    { value: this.targets().tactic.core,      color: 'var(--brand)', label: 'Core',        unit: '%' },
    { value: this.targets().tactic.satellite, color: '#8C6E2A',      label: 'Satellite',   unit: '%' },
    { value: this.targets().tactic.bonds,     color: 'var(--ink-3)', label: 'Obligations', unit: '%' },
  ]);

  private readonly fxService = inject(FxService);
  // FX-aware: converts EUR-base amounts into the display currency.
  protected readonly fmtEur = (n: number, d = 2): string => this.fxService.fmt(n, d);
  protected readonly fmtNum = fmtNum;
  protected readonly fmtPct = fmtPct;
  protected readonly abs    = Math.abs;

  protected computeRebalance(): void {
    if (this.loadingRebalance()) return;
    this.loadingRebalance.set(true);
    this.http.get<RebalancePlanDto>(`${this.baseUrl}/portfolio/rebalance`).subscribe({
      next: plan => { this.rebalancePlan.set(plan); this.loadingRebalance.set(false); },
      error: ()  => { this.loadingRebalance.set(false); },
    });
  }

  protected closeRebalance(): void { this.rebalancePlan.set(null); }

  protected readonly coherenceChecks = computed(() => {
    const t         = this.targets();
    const sumStrat  = t.strategic.stocks + t.strategic.bonds;
    const sumTactic = t.tactic.core + t.tactic.satellite + t.tactic.bonds;
    const etfValues = Object.values(t.etf);
    const sumEtf    = etfValues.reduce((a, b) => a + b, 0);
    const drift5    = Object.entries(this.realPct()).some(([tk, real]) => Math.abs(real - (t.etf[tk] ?? 0)) > 5);
    const envValues = Object.values(t.envelope ?? {});
    const sumEnv    = envValues.reduce((a, b) => a + b, 0);
    return [
      { ok: Math.abs(sumStrat  - 100) < 0.01, warn: false, label: 'Somme stratégique = 100 %', detail: `${t.strategic.stocks} + ${t.strategic.bonds}` },
      { ok: Math.abs(sumTactic - 100) < 0.01, warn: false, label: 'Somme tactique = 100 %',    detail: `${t.tactic.core} + ${t.tactic.satellite} + ${t.tactic.bonds}` },
      { ok: etfValues.length === 0 || Math.abs(sumEtf - 100) < 0.01, warn: false, label: 'Somme ETF = 100 %', detail: etfValues.length ? etfValues.join(' + ') : '—' },
      { ok: envValues.length === 0 || Math.abs(sumEnv - 100) < 0.01, warn: false, label: 'Somme enveloppes = 100 %', detail: envValues.length ? envValues.join(' + ') : 'non définie' },
      { ok: !drift5, warn: drift5, label: 'Drift ETF < 5 pts', detail: drift5 ? 'Drift > 5 pts détecté' : 'Tous dans la tolérance' },
    ];
  });

  protected drift(ticker: string): number {
    return (this.realPct()[ticker] ?? 0) - (this.targets().etf[ticker] ?? 0);
  }

  protected driftSev(drift: number): string {
    return Math.abs(drift) <= 2 ? 'gain' : Math.abs(drift) <= 5 ? 'warn' : 'loss';
  }

  protected action(drift: number): string {
    return drift > 5 ? 'Vendre' : drift < -3 ? 'Acheter' : 'Tenir';
  }

  protected driftBarW(val: number, target: number, real: number): string {
    const max = Math.max(target, real, 30);
    return (val / max) * 100 + '%';
  }
}
