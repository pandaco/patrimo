import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnvelopeService, FxService, PreferencesService, TransactionService } from '@patrimo/data-access';
import { fmtNum } from '@patrimo/ui';
import { computeProjection } from '../portfolio/projection';
import { computeTri } from '../portfolio/tri';
import { WealthChartComponent } from '../dashboard/wealth-chart.component';

@Component({
  selector: 'app-projection',
  standalone: true,
  imports: [FormsModule, WealthChartComponent],
  templateUrl: './projection.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectionComponent {
  private readonly envelopes   = inject(EnvelopeService);
  private readonly txService   = inject(TransactionService);
  private readonly preferences = inject(PreferencesService);
  private readonly fxService   = inject(FxService);

  protected readonly totalValue = this.envelopes.total;

  private readonly tri = computed(() => computeTri(this.txService.all(), this.totalValue()));

  protected readonly monthlyContribution = signal<number | null>(null);
  protected readonly annualRatePct       = signal<number | null>(null);
  protected readonly years               = signal(20);

  // Defaults follow the user's own numbers once preferences/TRI resolve, but
  // stay editable — this is a "what if" tool, not a locked-in forecast.
  protected readonly effectiveContribution = computed(() =>
    this.monthlyContribution() ?? this.preferences.current().monthlyTarget ?? 0,
  );
  protected readonly effectiveRate = computed(() =>
    this.annualRatePct() ?? this.tri() ?? 7,
  );

  protected readonly points = computed(() =>
    computeProjection(this.totalValue(), this.effectiveContribution(), this.effectiveRate(), this.years()),
  );

  protected readonly chartData = computed(() => this.points().map(p => p.value));
  protected readonly chartLabels = computed(() => {
    const startYear = new Date().getFullYear();
    return this.points().map(p => `${startYear + p.year}-01-01`);
  });

  protected readonly finalPoint = computed(() => this.points()[this.points().length - 1]);

  protected setContribution(value: number): void {
    this.monthlyContribution.set(value);
  }

  protected setRate(value: number): void {
    this.annualRatePct.set(value);
  }

  protected setYears(value: number): void {
    this.years.set(value);
  }

  protected readonly fmtEur = (n: number, d = 0): string => this.fxService.fmt(n, d);
  protected readonly fmtNum = fmtNum;
}
