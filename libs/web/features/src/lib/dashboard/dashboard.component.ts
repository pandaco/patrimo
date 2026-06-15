import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertService, AllocationService, AuthService, EnvelopeService, EtfService, FxService, PerformanceService, PreferencesService, TransactionService, etfCost, etfValue } from '@patrimo/data-access';
import { AlertType, PerformancePeriod } from '@patrimo/contracts';
import { DonutComponent, EnvGlyphComponent, TermComponent, fmtDate, fmtNum, fmtPct, fmtPctRaw } from '@patrimo/ui';
import { PerfChartComponent } from './perf-chart.component';
import { computePeriodPnl } from './period-pnl';
import { computeRealized, startOfYearISO } from '../portfolio/realized-pnl';
import { computeTri } from '../portfolio/tri';

const DASH_PERIODS: { id: PerformancePeriod; label: string }[] = [
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
  { id: '1Y', label: '1A' },
  { id: 'YTD', label: 'YTD' },
  { id: 'MAX', label: 'MAX' },
];

/**
 * Hero P&L selector. `1D` is frontend-only: the daily figure comes from
 * `price − prev` on the positions (no intraday history available), while the
 * chart below falls back to the 1-week series for context.
 */
type HeroPeriod = '1D' | PerformancePeriod;
const HERO_PERIODS: { id: HeroPeriod; label: string; caption: string }[] = [
  { id: '1D',  label: '1J',  caption: "aujourd'hui" },
  { id: '1W',  label: '1S',  caption: 'sur 1 semaine' },
  { id: '1M',  label: '1M',  caption: 'sur 1 mois' },
  { id: '3M',  label: '3M',  caption: 'sur 3 mois' },
  { id: 'YTD', label: 'YTD', caption: 'depuis le 1er janv.' },
  { id: '3Y',  label: '3A',  caption: 'sur 3 ans' },
  { id: '5Y',  label: '5A',  caption: 'sur 5 ans' },
];

const GLYPH_COLORS: Record<string, string> = {
  pea:'#16A34A', peapme:'#15803D', cto:'#EA580C', av:'#7C3AED',
  per:'#475569', pee:'#0284C7', livret:'#CA8A04', crypto:'#18181B',
  immo:'#DC2626', metal:'#B45309',
};

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
  imports: [RouterLink, DonutComponent, EnvGlyphComponent, PerfChartComponent, TermComponent],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly envelopes  = inject(EnvelopeService);
  private readonly etfs       = inject(EtfService);
  private readonly txService  = inject(TransactionService);
  private readonly alerts     = inject(AlertService);
  private readonly performanceService    = inject(PerformanceService);
  private readonly allocationService   = inject(AllocationService);
  private readonly auth       = inject(AuthService);
  private readonly preferences      = inject(PreferencesService);
  private readonly router     = inject(Router);
  protected readonly fxService       = inject(FxService);

  protected readonly firstName      = computed(() => this.auth.user()?.firstName ?? '');
  protected readonly fxRate         = this.fxService.rate;
  protected readonly displayCurrency = this.fxService.displayCurrency;

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
  }

  protected readonly envAll       = this.envelopes.all;
  protected readonly envLoading   = this.envelopes.loading;
  protected readonly totalValue   = this.envelopes.total;
  protected readonly totalBourse  = this.envelopes.totalBourse;
  protected readonly totalLivret  = this.envelopes.totalLivret;
  protected readonly totalCash    = this.envelopes.totalCash;
  protected readonly totalInvested = this.envelopes.totalInvested;

  // True when the user has not yet declared any envelope nor a single
  // transaction. The dashboard then swaps the noisy hero for an onboarding
  // card pointing at the three first steps.
  protected readonly isEmpty = computed(() =>
    this.totalValue() <= 0 && this.envelopes.all().length === 0
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
    this.etfs.all().reduce((a, e) => a + etfValue(e), 0)
  );
  protected readonly portfolioCost = computed(() =>
    this.etfs.all().reduce((a, e) => a + etfCost(e), 0)
  );
  protected readonly pnlValue = computed(() => this.portfolioValue() - this.portfolioCost());
  protected readonly pnlPct = computed(() => {
    const cost = this.portfolioCost();
    if (cost < 1) return 0;
    const ratio = (this.portfolioValue() / cost - 1) * 100;
    return Number.isFinite(ratio) ? ratio : 0;
  });
  protected readonly dayValue = computed(() =>
    this.etfs.all().reduce((a, e) => a + (e.price - e.prev) * e.qty, 0)
  );
  protected readonly dayPct = computed(() => {
    const value = this.portfolioValue();
    if (value < 1) return 0;
    const ratio = (this.dayValue() / value) * 100;
    return Number.isFinite(ratio) ? ratio : 0;
  });

  protected readonly topAlerts    = computed(() => this.alerts.all().slice(0, 3));
  protected readonly recentTx     = computed(() => this.txService.all().slice(0, 5));
  protected readonly txLabels     = this.txService.labels;

  protected readonly perfPortfolio  = computed(() => this.performanceService.series().portfolio);
  protected readonly perfBenchmark  = computed(() => this.performanceService.series().benchmark);
  protected readonly dashPeriods    = DASH_PERIODS;
  protected readonly dashPeriod     = this.performanceService.period;
  protected readonly annualized     = computed(() => this.performanceService.raw().annualized);

  // ─── Hero period P&L (Trade-Republic-style selector) ──────────────────────

  protected readonly heroPeriods = HERO_PERIODS;
  /** Non-null only in `1D` mode — every other period maps 1:1 to the service period. */
  private readonly heroDayMode = signal(false);
  protected readonly activeHeroPeriod = computed<HeroPeriod>(() =>
    this.heroDayMode() ? '1D' : this.performanceService.period(),
  );
  protected readonly heroPnl = computed(() => {
    if (this.activeHeroPeriod() === '1D') {
      return { eur: this.dayValue(), pct: this.dayPct() };
    }
    const raw = this.performanceService.raw();
    return computePeriodPnl(raw.labels, raw.portfolio, this.txService.all());
  });

  protected readonly heroPnlCaption = computed(() => {
    const active = this.activeHeroPeriod();
    return HERO_PERIODS.find(p => p.id === active)?.caption ?? `sur ${active}`;
  });

  protected readonly heroPnlEurText = computed(() => {
    const pnl = this.heroPnl();
    if (!pnl) return null;
    return `${pnl.eur >= 0 ? '+' : '−'}${this.fmtEur(Math.abs(pnl.eur), 2)}`;
  });
  protected readonly heroPnlPctText = computed(() => {
    const pnl = this.heroPnl();
    if (!pnl || pnl.pct === null) return null;
    return fmtPct(pnl.pct, 2);
  });
  protected readonly heroPnlPositive = computed(() => (this.heroPnl()?.eur ?? 0) >= 0);

  // Annualized projection of the YTD return. Only shown when YTD tab is active
  // and at least 14 days have elapsed since Jan 1 (avoids absurd early-year numbers).
  protected readonly ytdAnnualizedPct = computed(() => {
    if (this.activeHeroPeriod() !== 'YTD') return null;
    const pnl = this.heroPnl();
    if (!pnl || pnl.pct === null) return null;
    const jan1 = new Date(new Date().getFullYear(), 0, 1);
    const daysElapsed = Math.max(1, Math.ceil((Date.now() - jan1.getTime()) / 86_400_000));
    if (daysElapsed < 14) return null;
    const ann = (Math.pow(1 + pnl.pct / 100, 365 / daysElapsed) - 1) * 100;
    return Number.isFinite(ann) ? ann : null;
  });

  protected setHeroPeriod(id: HeroPeriod): void {
    if (id === '1D') {
      this.heroDayMode.set(true);
      this.performanceService.setPeriod('1W');
    } else {
      this.heroDayMode.set(false);
      this.performanceService.setPeriod(id);
    }
  }

  protected readonly portfolioPct = computed(() => {
    const pts = this.perfPortfolio();
    if (pts.length < 2) return null;
    const start = pts.find(v => v > 0) ?? 0;
    const end   = pts[pts.length - 1];
    // Need at least €1 of starting capital — otherwise tiny denominators
    // (a stray decimal during the first hour of a fresh account) turn
    // `end / start` into +Infinity and the headline shows nonsense.
    if (start < 1) return null;
    const ratio = (end / start - 1) * 100;
    return Number.isFinite(ratio) ? ratio : null;
  });

  protected readonly donutData = computed(() =>
    this.envelopes.all().map(e => ({
      value: e.value,
      color: GLYPH_COLORS[e.glyph] ?? '#999',
      label: e.label,
      unit:  '€',
    }))
  );

  protected readonly envPreview = computed(() => this.envelopes.all().slice(0, 6));

  // ─── Key indicators ────────────────────────────────────────────────────────
  // Ten metrics surfaced as a second hero row on the dashboard.

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
    const etfs = this.etfs.all();
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

  /** 10b. Money-weighted return (XIRR) — true annualised rate counting deposit timing. */
  protected readonly tri = computed(() =>
    computeTri(this.txService.all(), this.totalValue()),
  );

  /** 11. Biggest absolute drift between strategic-level target and reality. */
  protected readonly driftMax = computed(() => {
    const total = this.totalBourse() + 0;
    if (total <= 0) return null;
    const t = this.allocationService.targets().strategic;
    if (!t || (t.stocks + t.bonds) === 0) return null;
    // Real shares: stocks = boursier (PEA/CTO/AV/PER), bonds ≈ obligations sleeve.
    // Without per-ETF asset-class metadata we approximate "stocks" as all bourse
    // and "bonds" as 0 — refined when allocation-by-asset-class lands.
    const realStocksPct = 100;
    const driftStocks   = realStocksPct - t.stocks;
    return Math.abs(driftStocks);
  });

  protected readonly abs       = Math.abs;
  // FX-aware: converts EUR-base amounts into the display currency.
  protected readonly fmtEur = (n: number, d = 2): string => this.fxService.fmt(n, d);
  protected readonly fmtNum    = fmtNum;
  protected readonly fmtPct    = fmtPct;
  protected readonly fmtPctRaw = fmtPctRaw;
  protected readonly fmtDate   = fmtDate;

  protected getEnv(id: string) {
    return this.envelopes.all().find(e => e.id === id);
  }

  protected getEtf(isin: string | null) {
    return isin ? this.etfs.all().find(e => e.isin === isin) : null;
  }

  protected severityClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : 'info';
  }

  protected severityIcon(sev: string): string {
    return sev === 'warn' ? '!' : sev === 'gain' ? '✓' : 'i';
  }

  protected setPeriod(id: PerformancePeriod): void {
    // The chart card tabs and the hero selector share the service period;
    // leaving day mode keeps the hero P&L consistent with the chart data.
    this.heroDayMode.set(false);
    this.performanceService.setPeriod(id);
  }

  protected async dismissAlert(id: string): Promise<void> {
    await this.alerts.dismiss(id);
  }

  protected alertRoute(type: AlertType): string {
    switch (type) {
      case 'CASH_IDLE':         return '/tools/allocation';
      case 'PLAFOND_NEAR':      return '/wealth';
      case 'DIVIDEND_RECENT':   return '/transactions';
      case 'PEA_AGE_NEAR':      return '/wealth';
      case 'USD_CONCENTRATION': return '/tools/allocation';
      case 'DCA_PENDING':       return '/transactions';
      default:                  return '/tools/alerts';
    }
  }
}
