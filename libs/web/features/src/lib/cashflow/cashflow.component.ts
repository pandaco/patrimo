import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TauxChangeService, TransactionService } from '@patrimo/data-access';
import { formatNumber } from '@patrimo/ui';
import { computeMonthlyCashflow } from '../portfolio/cashflow';

@Component({
  selector: 'app-cashflow',
  standalone: true,
  imports: [],
  templateUrl: './cashflow.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashflowComponent {
  private readonly txService = inject(TransactionService);
  private readonly tauxChangeService = inject(TauxChangeService);

  protected readonly rows = computed(() => computeMonthlyCashflow(this.txService.all()));

  protected readonly maxAbs = computed(() =>
    Math.max(1, ...this.rows().map(r => Math.max(r.in, r.out))),
  );

  protected readonly avgIn  = computed(() => this.average(this.rows().map(r => r.in)));
  protected readonly avgOut = computed(() => this.average(this.rows().map(r => r.out)));
  protected readonly avgNet = computed(() => this.avgIn() - this.avgOut());
  protected readonly totalRevenus = computed(() => this.rows().reduce((a, r) => a + r.revenus, 0));

  private average(values: number[]): number {
    return values.length ? values.reduce((a, v) => a + v, 0) / values.length : 0;
  }

  protected inHeight(v: number): number {
    return (v / this.maxAbs()) * 100;
  }

  protected outHeight(v: number): number {
    return (v / this.maxAbs()) * 100;
  }

  protected monthLabel(iso: string): string {
    const d = new Date(iso + '-01T00:00:00');
    return d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  }

  protected readonly formatEuro = (n: number, d = 0): string => this.tauxChangeService.format(n, d);
  protected readonly formatNumber = formatNumber;
  protected readonly abs    = Math.abs;
}
