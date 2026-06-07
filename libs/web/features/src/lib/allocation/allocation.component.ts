import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AllocationService, API_BASE_URL, EtfService, etfValue } from '@patrimo/data-access';
import { RebalancePlanDto } from '@patrimo/contracts';
import { DeltaComponent, DonutComponent, fmtEur, fmtNum, fmtPct } from '@patrimo/ui';

interface SliceRow { label: string; value: number; pct: number; color: string }

type AllocBucket = 'Core' | 'Satellite' | 'Obligations';

interface StrategyVersion { v: string; date: string; desc: string; current: boolean }
const STRATEGY_VERSIONS: StrategyVersion[] = [
  { v: 'v3', date: '14 mars 2026',  desc: 'Core 72% / Satellite 18% / Oblig 10%', current: true  },
  { v: 'v2', date: '02 janv. 2025', desc: 'Core 70% / Satellite 20% / Oblig 10%', current: false },
  { v: 'v1', date: '20 août 2024',  desc: 'Core 60% / Satellite 30% / Oblig 10%', current: false },
];

const CURRENCY_COLORS: Record<string, string> = {
  EUR: '#16A34A',
  USD: '#0284C7',
  GBP: '#7C3AED',
};

@Component({
  selector: 'app-allocation',
  standalone: true,
  imports: [RouterLink, DeltaComponent, DonutComponent],
  templateUrl: './allocation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationComponent {
  private readonly allocSvc = inject(AllocationService);
  private readonly etfSvc   = inject(EtfService);
  private readonly http     = inject(HttpClient);
  private readonly baseUrl  = inject(API_BASE_URL);

  protected readonly rebalancePlan      = signal<RebalancePlanDto | null>(null);
  protected readonly loadingRebalance   = signal(false);
  protected readonly strategyVersions   = STRATEGY_VERSIONS;
  protected readonly selectedStrategyV  = signal<StrategyVersion | null>(null);

  protected readonly targets = this.allocSvc.targets;

  protected readonly total = computed(() =>
    this.etfSvc.all().reduce((a, e) => a + etfValue(e), 0),
  );

  protected readonly realPct = computed(() => {
    const total = this.total();
    const m: Record<string, number> = {};
    if (!total) return m;
    for (const e of this.etfSvc.all()) m[e.ticker] = (etfValue(e) / total) * 100;
    return m;
  });

  protected readonly tacticReal = computed<Record<AllocBucket, number>>(() => {
    const total = this.total();
    const acc: Record<AllocBucket, number> = { Core: 0, Satellite: 0, Obligations: 0 };
    if (!total) return acc;
    for (const e of this.etfSvc.all()) acc[e.alloc] += etfValue(e);
    return {
      Core:        (acc.Core        / total) * 100,
      Satellite:   (acc.Satellite   / total) * 100,
      Obligations: (acc.Obligations / total) * 100,
    };
  });

  protected readonly strategicReal = computed(() => {
    const t = this.tacticReal();
    return { stocks: t.Core + t.Satellite, bonds: t.Obligations };
  });

  protected readonly byCurrency = computed<SliceRow[]>(() => {
    const total = this.total();
    if (!total) return [];
    const acc = new Map<string, number>();
    for (const e of this.etfSvc.all()) {
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
    this.etfSvc.all().filter(e => this.targets().etf[e.ticker] != null),
  );

  protected readonly strategicDonut = computed(() => [
    { value: this.targets().strategic.stocks, color: 'var(--brand)',  label: 'Actions',     unit: '%' },
    { value: this.targets().strategic.bonds,  color: 'var(--ink-3)',  label: 'Obligations', unit: '%' },
  ]);

  protected readonly tacticDonut = computed(() => [
    { value: this.targets().tactic.core,      color: 'var(--brand)', label: 'Core',        unit: '%' },
    { value: this.targets().tactic.satellite, color: '#8C6E2A',      label: 'Satellite',   unit: '%' },
    { value: this.targets().tactic.bonds,     color: 'var(--ink-3)', label: 'Obligations', unit: '%' },
  ]);

  protected readonly fmtEur = fmtEur;
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
    return [
      { ok: Math.abs(sumStrat  - 100) < 0.01, warn: false, label: 'Somme stratégique = 100 %', detail: `${t.strategic.stocks} + ${t.strategic.bonds}` },
      { ok: Math.abs(sumTactic - 100) < 0.01, warn: false, label: 'Somme tactique = 100 %',    detail: `${t.tactic.core} + ${t.tactic.satellite} + ${t.tactic.bonds}` },
      { ok: etfValues.length === 0 || Math.abs(sumEtf - 100) < 0.01, warn: false, label: 'Somme ETF = 100 %', detail: etfValues.length ? etfValues.join(' + ') : '—' },
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
