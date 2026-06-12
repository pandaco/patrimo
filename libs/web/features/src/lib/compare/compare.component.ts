import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Etf, EtfService } from '@patrimo/data-access';
import { TransactionDialogComponent, fmtNum, fmtPctRaw } from '@patrimo/ui';

const MAX_SELECTION = 4;

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './compare.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareComponent {
  private readonly etfService = inject(EtfService);

  /** ETFs followed without a position. */
  protected readonly watchlist = computed(() =>
    this.etfService.all().filter(e => e.watchOnly),
  );

  protected async toggleWatch(isin: string, current: boolean): Promise<void> {
    try {
      await this.etfService.setWatchOnly(isin, !current);
    } catch {
      // Toggle failed — the catalog simply stays as it was.
    }
  }
  private readonly dialog = inject(MatDialog);

  /** ISINs the user has put on the comparator. Capped at `MAX_SELECTION`. */
  protected readonly selectedIsins = signal<string[]>([]);

  protected readonly filterOpen    = signal(false);
  protected readonly filterPea     = signal<'all' | 'yes' | 'no'>('all');
  protected readonly filterDistrib = signal<'all' | 'Capitalisant' | 'Distribuant'>('all');
  protected readonly filterTerMax  = signal<number | null>(null);
  protected readonly filterAlloc   = signal<'all' | 'Core' | 'Satellite' | 'Obligations'>('all');

  protected readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.filterPea()     !== 'all') n++;
    if (this.filterDistrib() !== 'all') n++;
    if (this.filterTerMax()  !== null)  n++;
    if (this.filterAlloc()   !== 'all') n++;
    return n;
  });

  protected resetFilters(): void {
    this.filterPea.set('all');
    this.filterDistrib.set('all');
    this.filterTerMax.set(null);
    this.filterAlloc.set('all');
  }

  protected readonly catalog = computed(() => {
    const all = this.etfService.all();
    const pea  = this.filterPea();
    const dist = this.filterDistrib();
    const ter  = this.filterTerMax();
    const alloc = this.filterAlloc();
    return all.filter(e => {
      if (pea  === 'yes' && !e.pea)                    return false;
      if (pea  === 'no'  && e.pea)                     return false;
      if (dist !== 'all' && e.distrib !== dist)         return false;
      if (ter  !== null  && e.ter * 100 > ter)          return false;
      if (alloc !== 'all' && e.alloc !== alloc)         return false;
      return true;
    });
  });

  protected readonly candidates = computed(() => {
    const selected = new Set(this.selectedIsins());
    return this.etfService.all().filter(e => selected.has(e.isin));
  });

  protected readonly canAddMore = computed(() => this.selectedIsins().length < MAX_SELECTION);

  constructor() {
    // Seed the comparator with the first three catalog rows as soon as it
    // hydrates — gives the page some content on first paint without forcing
    // the user to click.
    effect(() => {
      if (this.selectedIsins().length === 0 && this.catalog().length > 0) {
        this.selectedIsins.set(this.catalog().slice(0, 3).map(e => e.isin));
      }
    });
  }

  protected isSelected(isin: string): boolean {
    return this.selectedIsins().includes(isin);
  }

  protected buy(etf: Etf): void {
    this.dialog.open(TransactionDialogComponent, {
      data: { presetEtfIsin: etf.isin, presetType: 'BUY' },
      panelClass: 'tx-dialog-panel',
    });
  }

  protected toggle(etf: Etf): void {
    const current = this.selectedIsins();
    if (current.includes(etf.isin)) {
      this.selectedIsins.set(current.filter(i => i !== etf.isin));
    } else if (current.length < MAX_SELECTION) {
      this.selectedIsins.set([...current, etf.isin]);
    }
  }

  /**
   * Approximate 5-year total cost of ownership on a 500 €/month DCA, with the
   * usual 7 %/year market return assumption. The drag is the average AUM each
   * year times the ETF TER:
   *
   *     avgAUM_y = invested(0..y-1) + invested(0..y) / 2
   *     drag     = Σ_{y=1..5} avgAUM_y × ter
   *
   * Brokerage / spread costs are intentionally left out — they are envelope-
   * and instrument-dependent, the user already sees the monthly fee in the
   * DCA helper, and Yahoo Finance does not provide them. The number stays a
   * directional cost-of-management comparator rather than a precise TCO.
   */
  protected tco5y(ter: number, monthly = 500, annualReturn = 0.07): number {
    let aum = 0;
    let drag = 0;
    for (let y = 1; y <= 5; y++) {
      const aumStart = aum;
      const yearContrib = monthly * 12;
      aum = (aum + yearContrib) * (1 + annualReturn);
      const aumEnd = aum;
      drag += ((aumStart + aumEnd) / 2) * ter;
    }
    return drag;
  }

  protected readonly fmtNum    = fmtNum;
  protected readonly fmtPctRaw = fmtPctRaw;
}
