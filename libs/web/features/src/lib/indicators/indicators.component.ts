import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AllocationService, EnvelopeService, EtfService, TauxChangeService, PerformanceService, TransactionService, etfValue } from '@patrimo/data-access';
import { TipDirective, formatNumber, formatPercent } from '@patrimo/ui';
import { computeRealized, startOfYearISO } from '../portfolio/realized-plusValue';
import { computeTri } from '../portfolio/tri';

const KPI_IDS = ['rente', 'realized', 'concentration', 'dividends', 'streak', 'milestone', 'doubling'] as const;
type KpiId = (typeof KPI_IDS)[number];

interface StressScenario {
  id: string;
  label: string;
  drawdownPct: number;
  blurb: string;
}

// Pic-à-creux historiques de l'indice MSCI World en €. Sources :
// MSCI factsheet & investing.com (2000, 2008, 2020, 2022).
const STRESS_SCENARIOS: StressScenario[] = [
  { id: '2000', label: 'Krach dot-com (2000–2002)', drawdownPct: -49,
    blurb: 'Éclatement de la bulle tech. ~3 ans de baisse, lente reprise — l\'indice ne retrouve son plus haut qu\'en 2007.' },
  { id: '2008', label: 'Crise financière (2008–2009)', drawdownPct: -44,
    blurb: 'Faillite Lehman, contagion bancaire. Creux atteint en mars 2009 — récupération en ~2,5 ans.' },
  { id: '2020', label: 'Choc COVID (févr.–mars 2020)', drawdownPct: -34,
    blurb: 'Chute la plus rapide de l\'histoire moderne. Récupération en ~5 mois grâce aux relances massives.' },
  { id: '2022', label: 'Inflation + hausse des taux (2022)', drawdownPct: -20,
    blurb: 'Resserrement monétaire post-COVID. Drawdown lent et étalé, sortie en 2023.' },
];

@Component({
  selector: 'app-indicators',
  standalone: true,
  imports: [RouterLink, DragDropModule, TipDirective],
  templateUrl: './indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicatorsComponent {
  private readonly envelopes  = inject(EnvelopeService);
  private readonly etfs       = inject(EtfService);
  private readonly txService  = inject(TransactionService);
  private readonly performanceService = inject(PerformanceService);
  private readonly allocationService  = inject(AllocationService);
  private readonly tauxChangeService  = inject(TauxChangeService);

  constructor() {
    // All-time framing: "Repli vs sommet" reads against the all-time peak and
    // the CAGR feeding "Doublement" only exists for ≥1-year windows. The
    // dashboard re-asserts its own period on every visit, so no ping-pong.
    this.performanceService.setPeriod('MAX');

    // Restore the user's own ordering of the reorderable tiles. Anything
    // stale (old id set, corrupt JSON) falls back to the default order
    // rather than crashing on a partial/mismatched list.
    // Legacy key: the tiles lived on the dashboard first — kept so existing
    // users' ordering survives the move to this page.
    const KPI_ORDER_KEY = 'dashboard:kpiOrder';
    const storedOrder = localStorage.getItem(KPI_ORDER_KEY);
    if (storedOrder) {
      try {
        const parsed = JSON.parse(storedOrder) as string[];
        if (Array.isArray(parsed) && parsed.length === KPI_IDS.length && KPI_IDS.every(id => parsed.includes(id))) {
          this.kpiOrder.set(parsed as KpiId[]);
        }
      } catch { /* corrupt value — keep the default order */ }
    }
    effect(() => localStorage.setItem(KPI_ORDER_KEY, JSON.stringify(this.kpiOrder())));
  }

  protected readonly kpiOrder = signal<KpiId[]>([...KPI_IDS]);

  protected onKpiDrop(event: CdkDragDrop<KpiId[]>): void {
    const next = [...this.kpiOrder()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.kpiOrder.set(next);
  }

  protected readonly totalValue = this.envelopes.total;

  /** No data yet — every tile would read "—", point at the first steps instead. */
  protected readonly isEmpty = computed(() =>
    this.envelopes.all().length === 0 && this.txService.all().length === 0,
  );

  protected readonly portfolioValue = computed(() =>
    this.etfs.positions().reduce((a, e) => a + etfValue(e), 0)
  );

  protected readonly perfPortfolio = computed(() => this.performanceService.series().portfolio);
  protected readonly annualized    = computed(() => this.performanceService.raw().annualized);

  /** 1. Average €/month invested over the last 12 months (BUY + DEPOSIT). */
  protected readonly savingsVelocity = computed(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const invested = this.txService.all()
      .filter(t => (t.type === 'BUY' || t.type === 'DEPOSIT') && t.date >= cutoffIso)
      .reduce((a, t) => a + t.amount, 0);
    return invested / 12;
  });

  /** 2. Theoretical monthly income at the 4 %/yr safe withdrawal rate. */
  protected readonly swrIncome = computed(() => this.totalValue() * 0.04 / 12);

  /** 3. Current drawdown vs the all-time peak of the perf series. */
  protected readonly currentDrawdown = computed(() => {
    const series = this.perfPortfolio();
    if (series.length < 2) return null;
    const peak    = Math.max(...series);
    const current = series[series.length - 1];
    if (peak <= 0) return null;
    return ((current - peak) / peak) * 100;
  });

  /** 4. Realized YTD P&L via FIFO walk (same helper as Portfolio page). */
  protected readonly realizedYtd = computed(() =>
    computeRealized(this.txService.all(), startOfYearISO()).realizedSince,
  );

  /** 5. Concentration: share of the boursier portfolio held in the top 3 ETFs. */
  protected readonly concentrationTop3 = computed(() => {
    const etfs = this.etfs.positions();
    const total = etfs.reduce((a, e) => a + etfValue(e), 0);
    if (total <= 0) return null;
    const top = etfs.map(etfValue).sort((a, b) => b - a).slice(0, 3);
    const top3 = top.reduce((a, v) => a + v, 0);
    return (top3 / total) * 100;
  });

  /** 6. Total dividends + interest received over the last 12 months. */
  protected readonly dividends12M = computed(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const divs = this.txService.all().filter(t =>
      (t.type === 'DIVIDEND' || t.type === 'INTEREST') && t.date >= cutoffIso,
    );
    return { total: divs.reduce((a, t) => a + t.amount, 0), count: divs.length };
  });

  /** 7. Streak of consecutive months with at least one BUY or DEPOSIT. */
  protected readonly dcaStreak = computed(() => {
    const monthSet = new Set<string>();
    for (const t of this.txService.all()) {
      if (t.type === 'BUY' || t.type === 'DEPOSIT') monthSet.add(t.date.slice(0, 7));
    }
    let streak = 0;
    const cursor = new Date();
    cursor.setDate(1);
    for (let i = 0; i < 240; i++) {
      const ym = cursor.toISOString().slice(0, 7);
      if (!monthSet.has(ym)) break;
      streak++;
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return streak;
  });

  /** 8. Next round-number milestone the user is closing in on (with progress). */
  protected readonly milestoneProgress = computed(() => {
    const v = this.totalValue();
    const ladder = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000];
    const next = ladder.find(m => m > v) ?? v * 2;
    const prev = [...ladder].reverse().find(m => m <= v) ?? 0;
    const denom = next - prev;
    const pct = denom > 0 ? Math.max(0, Math.min(100, ((v - prev) / denom) * 100)) : 0;
    return { target: next, previous: prev, pct };
  });

  /** 9. Rule-of-72 doubling time at the current annualised return. */
  protected readonly doublingYears = computed(() => {
    const cagr = this.annualized();
    if (cagr === null || cagr <= 0 || !Number.isFinite(cagr)) return null;
    return 72 / cagr;
  });

  /** 10. Money-weighted return (XIRR) — true annualised rate counting deposit timing. */
  protected readonly tri = computed(() =>
    computeTri(this.txService.all(), this.totalValue()),
  );

  // Stress test — apply a historical-drawdown shock to the current
  // boursier book. Livrets and cash dormant are not exposed to market risk
  // so they're excluded from the shock.
  protected readonly stressScenarios = STRESS_SCENARIOS;
  protected readonly activeStress    = signal<StressScenario>(STRESS_SCENARIOS[2]);

  protected readonly stressBaseValue = this.portfolioValue;
  protected readonly stressLoss = computed(() =>
    this.stressBaseValue() * (this.activeStress().drawdownPct / 100),
  );
  protected readonly stressAfter = computed(() =>
    this.stressBaseValue() + this.stressLoss(),
  );

  protected selectStress(s: StressScenario): void { this.activeStress.set(s); }

  /** 11. Biggest absolute drift between strategic-level target and reality. */
  protected readonly driftMax = computed(() => {
    const portfolio = this.portfolioValue();
    if (portfolio <= 0) return null;
    const t = this.allocationService.targets().strategic;
    if (!t || (t.stocks + t.bonds) === 0) return null;
    // No per-ETF stocks/bonds split exists yet, so we approximate using the
    // existing `alloc` tag: ETFs tagged "Obligations" count as bonds, every
    // other alloc (Core/Satellite/Matières premières) counts as stocks.
    const bondsValue    = this.etfs.positions()
      .filter(e => e.alloc === 'Obligations')
      .reduce((a, e) => a + etfValue(e), 0);
    const realStocksPct = ((portfolio - bondsValue) / portfolio) * 100;
    const driftStocks    = realStocksPct - t.stocks;
    return Math.abs(driftStocks);
  });

  // TAUXCHANGE-aware: converts EUR-base amounts into the display currency.
  protected readonly formatEuro = (n: number, d = 2): string => this.tauxChangeService.format(n, d);
  protected readonly formatNumber = formatNumber;
  protected readonly formatPercent = formatPercent;
}
