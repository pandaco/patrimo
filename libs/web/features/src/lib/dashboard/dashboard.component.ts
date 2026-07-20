import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertService, AuthService, EnvelopeService, EtfService, TauxChangeService, LiabilityService, PerformanceService, PreferencesService, TransactionService, etfCost, etfValue } from '@patrimo/data-access';
import { AlertType, PerformancePeriod, PerformanceSeriesDto, WealthCategory, WealthReturnKey, WealthSeriesDto } from '@patrimo/contracts';
import { TermComponent, TipDirective, formatNumber, formatPercent } from '@patrimo/ui';
import { PerfChartComponent } from './perf-chart.component';
import { WealthChartComponent } from './wealth-chart.component';
import { computeContributed } from './contributed';

const WEALTH_PERIODS: { id: PerformancePeriod; label: string; caption: string }[] = [
  { id: '1D',  label: '1J',  caption: 'sur 1 jour' },
  { id: '1W',  label: '1S',  caption: 'sur 1 semaine' },
  { id: '1M',  label: '1M',  caption: 'sur 1 mois' },
  { id: '3M',  label: '3M',  caption: 'sur 3 mois' },
  { id: '6M',  label: '6M',  caption: 'sur 6 mois' },
  { id: 'YTD', label: 'YTD', caption: 'depuis le 1er janv.' },
  { id: '1Y',  label: '1A',  caption: 'sur 1 an' },
  { id: 'MAX', label: 'MAX', caption: 'depuis le début' },
];

const WEALTH_CATEGORIES: { id: 'all' | WealthCategory; label: string }[] = [
  { id: 'all',    label: 'Toutes les catégories' },
  { id: 'bourse', label: 'Investissements boursiers' },
  { id: 'livret', label: 'Épargne réglementée' },
  { id: 'immo',   label: 'Immobilier' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'metal',  label: 'Métaux précieux' },
  { id: 'cash',   label: 'Cash' },
];

/** Chart filter: whole patrimoine, one category, or one envelope (`env:<id>`). */
type WealthFilter = 'all' | WealthCategory | `env:${string}`;

// Euronext Paris core session: 09:00 – 17:30 Paris time, Mon–Fri.
// Holidays are ignored — they would require a lookup table and are a
// minor visual nit; "Marchés fermés" on a Bastille Day morning is wrong
// but cheap to live with until we wire a real calendar.
const MARKET_OPEN_MIN  = 9 * 60;
const MARKET_CLOSE_MIN = 17 * 60 + 30;
function isParisMarketOpen(now: Date): boolean {
  const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const day = paris.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = paris.getHours() * 60 + paris.getMinutes();
  return minutes >= MARKET_OPEN_MIN && minutes < MARKET_CLOSE_MIN;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, PerfChartComponent, WealthChartComponent, TermComponent, TipDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly envelopes  = inject(EnvelopeService);
  private readonly etfs       = inject(EtfService);
  private readonly txService  = inject(TransactionService);
  private readonly alerts     = inject(AlertService);
  private readonly performanceService    = inject(PerformanceService);
  private readonly liabilityService    = inject(LiabilityService);
  private readonly auth       = inject(AuthService);
  private readonly preferences      = inject(PreferencesService);
  private readonly router     = inject(Router);
  protected readonly tauxChangeService       = inject(TauxChangeService);

  protected readonly firstName      = computed(() => this.auth.user()?.firstName ?? '');
  protected readonly fxRate         = this.tauxChangeService.rate;
  protected readonly displayCurrency = this.tauxChangeService.displayCurrency;

  // Ticks every minute so the date and market state refresh without a reload.
  private readonly nowTick = signal(Date.now());

  protected readonly todayLabel = computed(() => {
    return new Date(this.nowTick()).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  });
  protected readonly marketOpen   = computed(() => isParisMarketOpen(new Date(this.nowTick())));
  protected readonly marketLabel  = computed(() => this.marketOpen() ? 'Marchés ouverts' : 'Marchés fermés');

  constructor() {
    const timer = setInterval(() => this.nowTick.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // First-time users land on the welcome flow instead of an empty
    // dashboard. Only fires once the real preferences are loaded so the
    // pessimistic default (onboardingDone: true) never causes a flash.
    effect(() => {
      if (!this.preferences.loading() && !this.preferences.current().onboardingDone && this.isEmpty()) {
        this.router.navigateByUrl('/welcome');
      }
    });

    // Restore the last selected chart period so a reload does not silently
    // reset the view (same pattern as compare:selected).
    const PERIOD_STORAGE_KEY = 'dashboard:period';
    const storedPeriod = localStorage.getItem(PERIOD_STORAGE_KEY);
    if (storedPeriod !== null && WEALTH_PERIODS.some(p => p.id === storedPeriod)) {
      this.dashboardPeriod.set(storedPeriod as PerformancePeriod);
    }
    effect(() => localStorage.setItem(PERIOD_STORAGE_KEY, this.dashboardPeriod()));

    // Single source of truth for the evolution chart period: pushes the one
    // dashboard period signal to both performance resources (wealth-series and
    // perf-vs-benchmark) so the € and % views never drift out of sync.
    effect(() => {
      const p = this.dashboardPeriod();
      this.performanceService.setPeriod(p);
      this.performanceService.setWealthPeriod(p);
    });
  }

  protected readonly envAll       = this.envelopes.all;
  protected readonly totalValue   = this.envelopes.total;
  protected readonly totalBourse  = this.envelopes.totalBourse;
  protected readonly totalLivret  = this.envelopes.totalLivret;
  protected readonly totalCash    = this.envelopes.totalCash;
  protected readonly totalLiabilities = this.liabilityService.total;
  /** Actifs (enveloppes) moins le capital restant dû sur les crédits en cours. */
  protected readonly netWorth = computed(() => this.totalValue() - this.totalLiabilities());

  // True when the user has not yet declared any envelope nor a single
  // transaction. The dashboard then swaps the noisy hero for an onboarding
  // card pointing at the three first steps.
  // The check strictly ensures the data has had a chance to load to avoid
  // flashing the onboarding state before rendering the dashboard graphs.
  protected readonly isEmpty = computed(() =>
    !this.envelopes.loading() &&
    this.auth.loaded() &&
    this.totalValue() <= 0 &&
    this.envelopes.all().length === 0
  );

  // "Configuration X/5" checklist — derived live, disappears at 5/5.
  protected readonly configSteps = computed(() => [
    { label: 'Définir ton profil investisseur', done: this.preferences.current().onboardingDone,           route: '/welcome' },
    { label: 'Créer ta première enveloppe',     done: this.envelopes.all().length > 0,               route: '/wealth' },
    { label: 'Saisir ta première opération',    done: this.txService.all().length > 0,               route: '/transactions' },
    { label: 'Choisir ton allocation cible',    done: this.preferences.current().allocationTargets !== null, route: '/settings/allocation' },
    { label: 'Fixer ton épargne mensuelle',     done: this.preferences.current().monthlyTarget > 0,        route: '/settings/preferences' },
  ]);
  protected readonly configDone = computed(() => this.configSteps().filter((s) => s.done).length);
  protected readonly showChecklist = computed(() =>
    !this.isEmpty() && !this.preferences.loading() && this.configDone() < this.configSteps().length
  );

  protected readonly portfolioValue = computed(() =>
    this.etfs.positions().reduce((a, e) => a + etfValue(e), 0)
  );
  protected readonly portfolioCost = computed(() =>
    this.etfs.positions().reduce((a, e) => a + etfCost(e), 0)
  );
  protected readonly pnlValue = computed(() => this.portfolioValue() - this.portfolioCost());
  protected readonly pnlPct = computed(() => {
    const cost = this.portfolioCost();
    if (cost < 1) return 0;
    const ratio = (this.portfolioValue() / cost - 1) * 100;
    return Number.isFinite(ratio) ? ratio : 0;
  });
  protected readonly dayValue = computed(() =>
    this.etfs.positions().reduce((a, e) => a + (e.price - e.prev) * e.qty, 0)
  );
  protected readonly dayPct = computed(() => {
    const value = this.portfolioValue();
    if (value < 1) return 0;
    const ratio = (this.dayValue() / value) * 100;
    return Number.isFinite(ratio) ? ratio : 0;
  });

  /** « Montant versé » — see `computeContributed` for the per-envelope rule. */
  protected readonly totalContributed = computed(() => computeContributed(this.txService.all()));

  protected readonly topAlerts    = computed(() => this.alerts.all().slice(0, 3));

  // --- NOUVEAUTÉ: Projets & Benchmarking Social ---
  protected readonly goalTarget = computed(() => this.preferences.current().goalTarget || 50000);
  protected readonly goalName = computed(() => this.preferences.current().goalName || '🏡 Apport Maison');
  
  protected readonly goalProgress = computed(() => {
    const wealth = this.totalValue();
    if (wealth === 0) return 0;
    return Math.min(100, (wealth / this.goalTarget()) * 100);
  });
  
  protected readonly socialBenchmark = computed(() => {
    const wealth = this.totalValue();
    if (wealth < 5000) return { pct: 80, text: "Tu commences à construire ton patrimoine. Continue !" };
    if (wealth < 20000) return { pct: 70, text: "Tu as plus de patrimoine que 30% des Français." };
    if (wealth < 50000) return { pct: 60, text: "Tu as plus de patrimoine que 40% des Français." };
    if (wealth < 100000) return { pct: 50, text: "Tu as plus de patrimoine que la moitié des Français !" };
    if (wealth < 200000) return { pct: 30, text: "Tu fais partie des 30% des Français les plus aisés." };
    if (wealth < 500000) return { pct: 10, text: "Tu fais partie des 10% des Français les plus aisés." };
    return { pct: 1, text: "Tu fais partie des 1% des Français les plus riches." };
  });

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

  protected readonly crashDrop = computed(() => {
    return this.envelopes.totalBourse() * 0.35; // Krach standard de -35% (ex: Covid 2020)
  });
  
  protected readonly crashWealth = computed(() => {
    return this.totalValue() - this.crashDrop();
  });
  // ------------------------------------------------

  // httpResource resets `value()` to the default while re-fetching, so a bare
  // read would blank the chart on every period switch. These linked signals
  // hold on to the last non-empty payload: the old curve stays rendered
  // (dimmed via `.chart-wrap.refreshing`) until the new one lands.
  private readonly heldWealth = linkedSignal<WealthSeriesDto, WealthSeriesDto>({
    source: this.performanceService.wealth,
    computation: (incoming, previous) =>
      incoming.labels.length > 0 || !previous ? incoming : previous.value,
  });
  private readonly heldPerf = linkedSignal<PerformanceSeriesDto, PerformanceSeriesDto>({
    source: this.performanceService.raw,
    computation: (incoming, previous) =>
      incoming.labels.length > 0 || !previous ? incoming : previous.value,
  });

  protected readonly perfPortfolio  = computed(() => this.heldPerf().portfolio);
  protected readonly perfBenchmark  = computed(() => this.heldPerf().benchmark ?? []);
  protected readonly perfLoading    = this.performanceService.loading;
  protected readonly perfPending    = computed(() => !this.auth.loaded() || this.perfLoading());

  // ─── Evolution chart (single card: € patrimoine ↔ % vs indice) ────────────

  /** One period drives both the wealth-series and perf-vs-benchmark resources. */
  protected readonly dashboardPeriods = WEALTH_PERIODS;
  protected readonly dashboardPeriod  = signal<PerformancePeriod>('1Y');
  /** `wealth` = patrimoine en euros · `perf` = performance vs benchmark en %. */
  protected readonly chartMode        = signal<'wealth' | 'perf'>('wealth');

  protected readonly wealthFilterCategories = WEALTH_CATEGORIES.filter(c => c.id !== 'all');
  /** Envelope entries of the chart filter — the Trade Republic-style per-envelope view. */
  protected readonly wealthFilterEnvelopes = computed(() =>
    this.envelopes.all().map(e => ({ id: `env:${e.id}` as const, label: `${e.code} · ${e.label}` }))
  );
  protected readonly wealthFilter       = signal<WealthFilter>('all');
  protected readonly wealthLoading      = this.performanceService.wealthLoading;
  protected readonly wealthPending      = computed(() => !this.auth.loaded() || this.wealthLoading());

  protected readonly wealthChartData = computed(() => {
    const w      = this.heldWealth();
    const filter = this.wealthFilter();
    if (filter === 'all') return w.total;
    if (filter.startsWith('env:')) return w.byEnvelope[filter.slice(4)] ?? [];
    return w.byCategory[filter as WealthCategory] ?? [];
  });

  protected readonly wealthLabels = computed(() => this.heldWealth().labels);

  /**
   * Period return for the CURRENT selection (period tab + category/envelope
   * filter), computed server-side on a clean invested base — an unfunded buy
   * drives the cash-inclusive chart series negative and would wreck a TWR.
   * `twrPct` is the headline (comparable to an index), `eur` the euro gain.
   * Reads the held payload so a period switch keeps showing the previous
   * figure (dimmed chart) instead of flashing an empty state.
   */
  protected readonly wealthReturn = computed(() => {
    const period = this.dashboardPeriod();
    const filter = this.wealthFilter();

    if (period === '1D' && (filter === 'all' || filter === 'bourse')) {
      return {
        eur: this.dayValue(),
        twrPct: this.dayPct(),
        investedReturnPct: null,
        annualizedPct: null,
      };
    }

    if (this.wealthChartData().length < 2) return null;
    const w = this.heldWealth();
    if (filter !== 'all' && filter.startsWith('env:')) return w.returnsByEnvelope[filter.slice(4)] ?? null;
    return w.returns?.[filter as WealthReturnKey] ?? null;
  });

  protected readonly wealthPeriodCaption = computed(() => {
    const id = this.dashboardPeriod();
    return WEALTH_PERIODS.find(p => p.id === id)?.caption ?? id;
  });

  /** Human label of the active filter, `null` for the whole patrimoine. */
  protected readonly wealthFilterCaption = computed(() => {
    const filter = this.wealthFilter();
    if (filter === 'all') return null;
    if (filter.startsWith('env:')) return this.wealthFilterEnvelopes().find(e => e.id === filter)?.label ?? null;
    return WEALTH_CATEGORIES.find(c => c.id === filter)?.label ?? null;
  });

  protected setDashboardPeriod(id: PerformancePeriod): void {
    this.dashboardPeriod.set(id);
  }

  protected setChartMode(mode: 'wealth' | 'perf'): void {
    this.chartMode.set(mode);
  }

  protected setWealthFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as WealthFilter;
    this.wealthFilter.set(value);
  }

  protected readonly abs       = Math.abs;
  // TAUXCHANGE-aware: converts EUR-base amounts into the display currency.
  protected readonly formatEuro = (n: number, d = 2): string => this.tauxChangeService.format(n, d);
  protected readonly formatNumber    = formatNumber;
  protected readonly formatPercent    = formatPercent;

  protected severityClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : 'info';
  }

  protected severityIcon(sev: string): string {
    return sev === 'warn' ? '!' : sev === 'gain' ? '✓' : 'i';
  }

  protected async dismissAlert(id: string): Promise<void> {
    await this.alerts.dismiss(id);
  }

  protected alertRoute(type: AlertType): string {
    switch (type) {
      case 'CASH_IDLE':         return '/tools/dca';   // CTA « Lancer le DCA »
      case 'PLAFOND_NEAR':      return '/wealth';
      case 'DIVIDEND_RECENT':   return '/transactions';
      case 'PEA_AGE_NEAR':      return '/wealth';
      case 'USD_CONCENTRATION': return '/allocation';
      case 'DCA_PENDING':       return '/transactions';
      case 'ALLOCATION_DRIFT':  return '/allocation';  // CTA « Voir le plan de rééquilibrage »
      default:                  return '/tools/alerts';
    }
  }
}
