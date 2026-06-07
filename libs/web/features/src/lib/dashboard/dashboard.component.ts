import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertService, AllocationService, AuthService, EnvelopeService, EtfService, FxService, PerformanceService, TransactionService, etfCost, etfValue } from '@patrimo/data-access';
import { AlertType, PerformancePeriod } from '@patrimo/contracts';
import { DeltaComponent, DonutComponent, EnvGlyphComponent, fmtDate, fmtEur, fmtNum, fmtPct, fmtPctRaw } from '@patrimo/ui';
import { PerfChartComponent } from './perf-chart.component';
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
  imports: [RouterLink, DeltaComponent, DonutComponent, EnvGlyphComponent, PerfChartComponent],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly envelopes  = inject(EnvelopeService);
  private readonly etfs       = inject(EtfService);
  private readonly txService  = inject(TransactionService);
  private readonly alerts     = inject(AlertService);
  private readonly perfSvc    = inject(PerformanceService);
  private readonly allocSvc   = inject(AllocationService);
  private readonly auth       = inject(AuthService);
  protected readonly fx       = inject(FxService);

  protected readonly firstName      = computed(() => this.auth.user()?.firstName ?? '');
  protected readonly fxRate         = this.fx.rate;
  protected readonly displayCurrency = this.fx.displayCurrency;

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

  protected readonly portfolioValue = computed(() =>
    this.etfs.all().reduce((a, e) => a + etfValue(e), 0)
  );
  protected readonly portfolioCost = computed(() =>
    this.etfs.all().reduce((a, e) => a + etfCost(e), 0)
  );
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

  protected readonly perfPortfolio  = computed(() => this.perfSvc.series().portfolio);
  protected readonly perfBenchmark  = computed(() => this.perfSvc.series().benchmark);
  protected readonly dashPeriods    = DASH_PERIODS;
  protected readonly dashPeriod     = this.perfSvc.period;
  protected readonly annualized     = computed(() => this.perfSvc.raw().annualized);

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
    const t = this.allocSvc.targets().strategic;
    if (!t || (t.stocks + t.bonds) === 0) return null;
    // Real shares: stocks = boursier (PEA/CTO/AV/PER), bonds ≈ obligations sleeve.
    // Without per-ETF asset-class metadata we approximate "stocks" as all bourse
    // and "bonds" as 0 — refined when allocation-by-asset-class lands.
    const realStocksPct = 100;
    const driftStocks   = realStocksPct - t.stocks;
    return Math.abs(driftStocks);
  });

  protected readonly fmtEur    = fmtEur;
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

  protected sevClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : 'info';
  }

  protected sevIcon(sev: string): string {
    return sev === 'warn' ? '!' : sev === 'gain' ? '✓' : 'i';
  }

  protected setPeriod(id: PerformancePeriod): void {
    this.perfSvc.setPeriod(id);
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
