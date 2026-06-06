import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EtfService, ExposureService, TransactionService, Etf, etfValue, etfCost, etfPnl, etfPnlPct, etfDayPct, API_BASE_URL } from '@patrimo/data-access';
import { BarComponent, DeltaComponent, SparklineComponent, fmtEur, fmtNum, fmtPctRaw } from '@patrimo/ui';
import { firstValueFrom } from 'rxjs';

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

  // FIFO realized P&L since the start of the calendar year.
  // We replay every BUY/SELL chronologically per ETF, popping units from the oldest
  // lots first. Only the realized leg of a SELL that lands in the current year is
  // counted — partial sells (the previous closed-positions card ignored them) and
  // mixed-cost-basis lots are now handled correctly.
  protected readonly realizedYtd = computed(() => {
    const startOfYear = `${new Date().getFullYear()}-01-01`;
    const lots = new Map<string, { qty: number; pricePerUnit: number }[]>();
    let realized = 0;

    const sorted = this.txSvc.all()
      .filter(t => t.etf && (t.type === 'BUY' || t.type === 'SELL'))
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const t of sorted) {
      const isin = t.etf;
      if (!isin) continue;
      const queue = lots.get(isin) ?? [];
      if (queue.length === 0) lots.set(isin, queue);

      if (t.type === 'BUY') {
        queue.push({ qty: t.qty, pricePerUnit: t.amount / t.qty });
        continue;
      }

      let remaining = t.qty;
      const sellPerUnit = t.amount / t.qty;
      while (remaining > 0 && queue.length > 0) {
        const lot = queue[0];
        const take = Math.min(remaining, lot.qty);
        if (t.date >= startOfYear) {
          realized += take * (sellPerUnit - lot.pricePerUnit);
        }
        lot.qty -= take;
        remaining -= take;
        if (lot.qty < 1e-9) queue.shift();
      }
    }
    return realized;
  });

  protected readonly closedPositions = computed(() => {
    const txs  = this.txSvc.all();
    const etfs = this.etfSvc.all();
    const etfByIsin = new Map(etfs.map(e => [e.isin, e]));

    const map = new Map<string, { buyQty: number; sellQty: number; buyCost: number; sellProceeds: number; lastSell: string }>();
    for (const t of txs) {
      if (!t.etf || (t.type !== 'BUY' && t.type !== 'SELL')) continue;
      const e = map.get(t.etf) ?? { buyQty: 0, sellQty: 0, buyCost: 0, sellProceeds: 0, lastSell: '' };
      if (t.type === 'BUY')  { e.buyQty += t.qty; e.buyCost += t.amount; }
      if (t.type === 'SELL') { e.sellQty += t.qty; e.sellProceeds += t.amount; e.lastSell = t.date > e.lastSell ? t.date : e.lastSell; }
      map.set(t.etf, e);
    }

    return Array.from(map.entries())
      .filter(([, e]) => e.sellQty > 0 && Math.abs(e.buyQty - e.sellQty) < 0.001)
      .map(([isin, e]) => {
        const etf = etfByIsin.get(isin);
        const realizedPnl = e.sellProceeds - e.buyCost;
        return { isin, ticker: etf?.ticker ?? isin, name: etf?.name ?? isin, realizedPnl, sellProceeds: e.sellProceeds, buyCost: e.buyCost, lastSell: e.lastSell };
      })
      .sort((a, b) => b.lastSell.localeCompare(a.lastSell));
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
