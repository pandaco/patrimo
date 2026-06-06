import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EtfService, ExposureService, TransactionService, Etf, etfValue, etfCost, etfPnl, etfPnlPct, etfDayPct, API_BASE_URL } from '@patrimo/data-access';
import { BarComponent, DeltaComponent, SparklineComponent, fmtEur, fmtNum, fmtPctRaw } from '@patrimo/ui';
import { firstValueFrom } from 'rxjs';
import { computeRealized, startOfYearISO } from './realized-pnl';

type AllocFilter = 'Toutes' | 'Core' | 'Satellite' | 'Obligations';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [BarComponent, DeltaComponent, SparklineComponent],
  templateUrl: './portfolio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioComponent {
  private readonly etfSvc  = inject(EtfService);
  private readonly expSvc  = inject(ExposureService);
  private readonly txSvc   = inject(TransactionService);
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  protected readonly allocFilter = signal<AllocFilter>('Toutes');
  protected readonly allocTabs: AllocFilter[] = ['Toutes', 'Core', 'Satellite', 'Obligations'];

  protected readonly allEtfs  = this.etfSvc.all;
  protected readonly sparks   = this.etfSvc.sparks;
  protected readonly loading  = this.etfSvc.loading;
  protected readonly geo     = this.expSvc.geo;
  protected readonly sector  = this.expSvc.sector;
  protected readonly curr    = this.expSvc.curr;

  protected readonly filtered = computed(() => {
    const f = this.allocFilter();
    return f === 'Toutes' ? this.allEtfs() : this.allEtfs().filter(e => e.alloc === f);
  });

  protected readonly total     = computed(() => this.allEtfs().reduce((a, e) => a + etfValue(e), 0));
  protected readonly totalCost = computed(() => this.allEtfs().reduce((a, e) => a + etfCost(e), 0));
  protected readonly totalPnl  = computed(() => this.total() - this.totalCost());
  protected readonly totalDay  = computed(() => this.allEtfs().reduce((a, e) => a + (e.price - e.prev) * e.qty, 0));

  // Cost-basis-aware FIFO replay of every BUY/SELL, scoped to the current
  // calendar year. The pure function and its spec live in `realized-pnl.ts`.
  private readonly realizedReport = computed(() =>
    computeRealized(this.txSvc.all(), startOfYearISO()),
  );
  protected readonly realizedYtd      = computed(() => this.realizedReport().realizedSince);
  protected readonly orphanSellCount  = computed(() => this.realizedReport().orphanSellCount);
  protected readonly orphanSellUnits  = computed(() => this.realizedReport().orphanSellUnits);

  // Sourced from the same FIFO walk as `realizedYtd` so both cards on the page
  // share one cost-basis model (drift-free) and a single tx-list traversal.
  protected readonly closedPositions = computed(() => {
    const etfByIsin = new Map(this.etfSvc.all().map(e => [e.isin, e]));
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

  protected readonly dividends12M = computed(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const divs = this.txSvc.all().filter(t =>
      (t.type === 'DIVIDEND' || t.type === 'INTEREST') && new Date(t.date) >= cutoff,
    );
    return { total: divs.reduce((a, t) => a + t.amount, 0), count: divs.length };
  });

  protected readonly fmtEur    = fmtEur;
  protected readonly fmtNum    = fmtNum;
  protected readonly fmtPctRaw = fmtPctRaw;

  protected eV(e: Etf)  { return etfValue(e); }
  protected eC(e: Etf)  { return etfCost(e); }
  protected eP(e: Etf)  { return etfPnl(e); }
  protected ePP(e: Etf) { return etfPnlPct(e) * 100; }
  protected eD(e: Etf)  { return etfDayPct(e) * 100; }
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
