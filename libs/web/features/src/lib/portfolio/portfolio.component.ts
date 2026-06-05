import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EtfService, ExposureService, Etf, etfValue, etfCost, etfPnl, etfPnlPct, etfDayPct } from '@patrimo/data-access';
import { BarComponent, DeltaComponent, SparklineComponent, fmtEur, fmtNum, fmtPctRaw } from '@patrimo/ui';

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

  protected readonly allocFilter = signal<AllocFilter>('Toutes');
  protected readonly allocTabs: AllocFilter[] = ['Toutes', 'Core', 'Satellite', 'Obligations'];

  protected readonly allEtfs = this.etfSvc.all;
  protected readonly sparks  = this.etfSvc.sparks;
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
}
