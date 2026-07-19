import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { API_BASE_URL, Etf, etfCost, etfDayPct, etfPnl, etfPnlPct, EtfService, etfValue, ExposureService, TauxChangeService, TransactionService, EnvelopeService } from '@patrimo/data-access';
import { BarComponent, DeltaComponent, SparklineComponent, TermComponent, TipDirective, formatNumber, formatQuantity, formatPercentRaw } from '@patrimo/ui';
import { PerfChartComponent } from '../dashboard/perf-chart.component';
import { firstValueFrom } from 'rxjs';
import { computeRealized, startOfYearISO } from './realized-plusValue';
import { computeEtfOverlaps } from './overlap';

type AllocFilter = 'Toutes' | 'Core' | 'Satellite' | 'Obligations';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [BarComponent, DeltaComponent, SparklineComponent, TermComponent, TipDirective, PerfChartComponent],
  templateUrl: './portfolio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioComponent {
  private readonly etfService  = inject(EtfService);
  private readonly exposureService  = inject(ExposureService);
  private readonly transactionService   = inject(TransactionService);
  protected readonly envelopeService = inject(EnvelopeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  protected readonly allocFilter = signal<AllocFilter>('Toutes');
  protected readonly allocTabs: AllocFilter[] = ['Toutes', 'Core', 'Satellite', 'Obligations'];
  protected readonly expandedIsin = signal<string | null>(null);
  protected readonly envelopeFilter = signal<string | null>(null);

  protected readonly envelopeFilterLabel = computed(() => {
    const id = this.envelopeFilter();
    if (!id) return '';
    const env = this.envelopeService.all().find(e => e.id === id);
    return env ? `${env.label} — ${env.broker}` : '';
  });

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['env']) {
        this.envelopeFilter.set(params['env']);
      } else {
        this.envelopeFilter.set(null);
      }
    });
  }

  protected setEnvelopeFilter(envId: string): void {
    if (envId) {
      this.router.navigate([], { queryParams: { env: envId }, queryParamsHandling: 'merge' });
    } else {
      const currentParams = { ...this.route.snapshot.queryParams };
      delete currentParams['env'];
      this.router.navigate([], { queryParams: currentParams });
    }
  }

  protected toggleRow(isin: string): void {
    this.expandedIsin.update(current => current === isin ? null : isin);
  }

  // Cost-basis-aware local accumulation if envelope is selected
  protected readonly allEtfs = computed(() => {
    const envId = this.envelopeFilter();
    const globalEtfs = this.etfService.all();
    if (!envId) return this.etfService.positions();

    const txs = this.transactionService.all().filter(t => t.envelope === envId);
    const byIsin = new Map<string, { qty: number; invested: number; buyQty: number; buyCost: number }>();

    for (const t of txs) {
      if (!t.etf) continue;
      const pos = byIsin.get(t.etf) ?? { qty: 0, invested: 0, buyQty: 0, buyCost: 0 };
      if (t.type === 'BUY' || t.type === 'SELL') {
        const sign = t.type === 'BUY' ? 1 : -1;
        const price = t.price ?? 0;
        const costs = (t.fees ?? 0) + (t.taxes ?? 0);
        const grossCost = t.qty * price + (t.type === 'BUY' ? costs : -costs);
        pos.qty += sign * t.qty;
        pos.invested += sign * grossCost;
        if (sign > 0) {
          pos.buyQty += t.qty;
          pos.buyCost += grossCost;
        }
      }
      byIsin.set(t.etf, pos);
    }

    return Array.from(byIsin.entries())
      .filter(([isin, pos]) => pos.qty > 1e-6)
      .map(([isin, pos]) => {
        const etf = globalEtfs.find(e => e.isin === isin);
        if (!etf) return null;
        return {
          ...etf,
          qty: pos.qty,
          pru: pos.buyQty > 0 ? pos.buyCost / pos.buyQty : 0,
        };
      })
      .filter((e): e is Etf => e !== null)
      .sort((a, b) => etfValue(b) - etfValue(a));
  });

  protected readonly sparks   = this.etfService.sparks;
  protected readonly loading  = this.etfService.loading;
  protected readonly geography     = this.exposureService.geography;
  protected readonly sector  = this.exposureService.sector;
  protected readonly curr    = this.exposureService.curr;

  protected readonly filtered = computed(() => {
    const f = this.allocFilter();
    return f === 'Toutes' ? this.allEtfs() : this.allEtfs().filter(e => e.alloc === f);
  });

  protected readonly total     = computed(() => this.allEtfs().reduce((a, e) => a + etfValue(e), 0));
  protected readonly totalCost = computed(() => this.allEtfs().reduce((a, e) => a + etfCost(e), 0));
  protected readonly totalPnl  = computed(() => this.total() - this.totalCost());
  protected readonly totalDay  = computed(() => this.allEtfs().reduce((a, e) => a + (e.price - e.prev) * e.qty, 0));

  // Cost-basis-aware FIFO replay of every BUY/SELL, scoped to the current
  // calendar year. The pure function and its spec live in `realized-plusValue.ts`.
  private readonly realizedReport = computed(() => {
    const envId = this.envelopeFilter();
    let txs = this.transactionService.all();
    if (envId) txs = txs.filter(t => t.envelope === envId);
    return computeRealized(txs, startOfYearISO());
  });
  protected readonly realizedYtd      = computed(() => this.realizedReport().realizedSince);
  protected readonly orphanSellCount  = computed(() => this.realizedReport().orphanSellCount);
  protected readonly orphanSellUnits  = computed(() => this.realizedReport().orphanSellUnits);

  // Sourced from the same FIFO walk as `realizedYtd` so both cards on the page
  // share one cost-basis model (drift-free) and a single transaction-list traversal.
  protected readonly closedPositions = computed(() => {
    const etfByIsin = new Map(this.etfService.all().map(e => [e.isin, e]));
    return this.realizedReport().closedPositions.map(p => {
      const etf = etfByIsin.get(p.isin);
      return {
        isin:         p.isin,
        ticker:       etf?.ticker ?? p.isin,
        name:         etf?.name   ?? p.isin,
        realizedPnl:  p.realizedPnl,
        sellProceeds: p.sellProceeds,
        buyCost:      p.buyCost,
        lastSell:     p.lastSell,
      };
    });
  });

  // Two different tickers can still be the same bet — flags held ETF pairs
  // sharing heavy geography/sector exposure. Pure fn + spec in `overlap.ts`.
  protected readonly overlaps = computed(() => computeEtfOverlaps(this.allEtfs()));

  protected readonly dividends12M = computed(() => {
    const envId = this.envelopeFilter();
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    let txs = this.transactionService.all();
    if (envId) txs = txs.filter(t => t.envelope === envId);
    
    const divs = txs.filter(t =>
      (t.type === 'DIVIDEND' || t.type === 'INTEREST') && new Date(t.date) >= cutoff,
    );
    return { total: divs.reduce((a, t) => a + t.amount, 0), count: divs.length };
  });

  private readonly tauxChangeService = inject(TauxChangeService);
  // TAUXCHANGE-aware: converts EUR-base amounts into the display currency.
  protected readonly formatEuro = (n: number, d = 2): string => this.tauxChangeService.format(n, d);
  protected readonly formatNumber    = formatNumber;
  protected readonly formatQuantity    = formatQuantity;
  protected readonly formatPercentRaw = formatPercentRaw;

  protected rowValue(e: Etf)  { return etfValue(e); }
  protected rowCost(e: Etf)  { return etfCost(e); }
  protected rowPnl(e: Etf)  { return etfPnl(e); }
  protected rowPnlPct(e: Etf) { return etfPnlPct(e) * 100; }
  protected rowDayPct(e: Etf)  { return etfDayPct(e) * 100; }
  protected wt(e: Etf)  { return etfValue(e) / this.total() * 100; }

  protected maxExp(data: { pct: number }[]) { return Math.max(...data.map(d => d.pct)); }

  // Coarse risk classifier for the per-line badge. Volatility data isn't on
  // `Etf` yet, so we lean on the user-declared `alloc` bucket and a few
  // heuristics: Obligations are defensive, Core MSCI/S&P-style is balanced,
  // and Satellite (thematic, regional, levered) is aggressive by definition.
  protected riskLevel(etf: Etf): 'defensive' | 'balanced' | 'aggressive' {
    if (etf.alloc === 'Obligations') return 'defensive';
    if (etf.alloc === 'Satellite')   return 'aggressive';
    return 'balanced';
  }
  protected riskLabel(etf: Etf): string {
    switch (this.riskLevel(etf)) {
      case 'defensive':  return 'Défensif';
      case 'balanced':   return 'Équilibré';
      case 'aggressive': return 'Agressif';
    }
  }
  protected riskTip(etf: Etf): string {
    switch (this.riskLevel(etf)) {
      case 'defensive':  return 'Profil défensif — obligations ou produits monétaires. Volatilité faible (< 5 %/an typique), gains modestes mais drawdown limité. Stabilise le portefeuille en cas de krach actions.';
      case 'balanced':   return 'Profil équilibré — actions monde diversifiées (Core MSCI / S&P 500). Volatilité ~15 %/an, drawdowns historiques jusqu\'à −35 % (2008, 2020). Le moteur long terme du portefeuille.';
      case 'aggressive': return 'Profil agressif — thématiques, régions concentrées, sectoriels. Volatilité > 20 %/an, drawdowns possibles > −50 %. Espérance de surperformance compensée par un risque accru — à doser dans la poche Satellite.';
    }
  }

  protected async exportCsv(): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.baseUrl}/portfolio/export`, { responseType: 'blob' }),
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = 'positions.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}
