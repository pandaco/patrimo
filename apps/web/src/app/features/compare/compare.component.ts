import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Etf, EtfService } from 'data-access';
import { fmtNum, fmtPctRaw } from 'ui';

const MAX_SELECTION = 4;

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [],
  templateUrl: './compare.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareComponent {
  private readonly etfSvc = inject(EtfService);

  /** ISINs the user has put on the comparator. Capped at `MAX_SELECTION`. */
  protected readonly selectedIsins = signal<string[]>([]);

  protected readonly catalog    = computed(() => this.etfSvc.all());
  protected readonly candidates = computed(() => {
    const selected = new Set(this.selectedIsins());
    return this.catalog().filter(e => selected.has(e.isin));
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
