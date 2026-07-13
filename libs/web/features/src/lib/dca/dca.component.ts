import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { AllocationService, DcaPlanService, EnvelopeService, EtfService, etfValue, TauxChangeService, ToastService, TransactionService } from '@patrimo/data-access';
import { BarComponent, brokerageFee, fmtNum, fmtPctRaw, TipDirective } from '@patrimo/ui';

// Glyphs eligible as a DCA destination — securities-bearing envelopes only
// (livret / crypto / immo / metal cannot host an ETF buy).
const INVESTABLE_GLYPHS = new Set(['pea', 'peapme', 'cto', 'av', 'per', 'pee']);

@Component({
  selector: 'app-dca',
  standalone: true,
  imports: [FormsModule, RouterLink, BarComponent, DatePipe, KeyValuePipe, TipDirective],
  templateUrl: './dca.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DcaComponent {
  private readonly etfService   = inject(EtfService);
  private readonly allocationService = inject(AllocationService);
  private readonly envelopeService   = inject(EnvelopeService);
  private readonly dcaPlanService = inject(DcaPlanService);
  private readonly transactionService = inject(TransactionService);

  protected readonly amount     = signal(800);
  protected readonly correction = signal(true);
  protected readonly envelopeId = signal('');
  protected readonly dayOfMonth = signal(5);

  protected readonly presets    = [300, 500, 800, 1000, 1500, 2000];

  protected readonly activePlans = this.dcaPlanService.all;

  protected readonly envelopes = computed(() =>
    this.envelopeService.all().filter(e => INVESTABLE_GLYPHS.has(e.glyph)),
  );

  protected readonly selectedEnvelope = computed(() => {
    const list = this.envelopes();
    return list.find(e => e.id === this.envelopeId()) ?? list[0];
  });

  constructor() {
    // Auto-pick the first investable envelope once the list hydrates.
    effect(() => {
      if (!this.envelopeId() && this.envelopes().length > 0) {
        this.envelopeId.set(this.envelopes()[0].id);
      }
    });
  }

  private readonly etfsWithTargets = computed(() =>
    this.etfService.all().filter(e => this.allocationService.targets().etf[e.ticker] != null),
  );

  private readonly total = computed(() =>
    this.etfsWithTargets().reduce((a, e) => a + etfValue(e), 0),
  );

  protected readonly rows = computed(() => {
    const etfs       = this.etfsWithTargets();
    const total      = this.total();
    const amount     = this.amount();
    const correction = this.correction();
    const targets    = this.allocationService.targets().etf;

    return etfs.map(e => {
      const target  = targets[e.ticker];
      const realPct = total ? (etfValue(e) / total) * 100 : 0;
      const drift   = realPct - target;
      let weight: number;
      if (correction) {
        const targetValue = (target / 100) * (total + amount);
        weight = Math.max(0, targetValue - etfValue(e));
      } else {
        weight = (target / 100) * amount;
      }
      return { e, target, realPct, drift, weight };
    });
  });

  protected readonly normalized = computed(() => {
    const rows  = this.rows();
    const total = rows.reduce((a, r) => a + r.weight, 0) || 1;
    const amount = this.amount();
    return rows.map(r => ({ ...r, eur: (r.weight / total) * amount }));
  });

  protected readonly totalSpent = computed(() =>
    this.normalized().reduce((a, r) => a + Math.floor(r.eur / r.e.price) * r.e.price, 0),
  );
  protected readonly totalQty = computed(() =>
    this.normalized().reduce((a, r) => a + Math.floor(r.eur / r.e.price), 0),
  );

  private readonly toasts = inject(ToastService);

  protected readonly cashAfter = computed(() => {
    const env = this.selectedEnvelope();
    return env ? env.cash - this.totalSpent() : 0;
  });

  protected readonly avgDriftBefore = computed(() => {
    const rows = this.rows();
    if (!rows.length) return 0;
    return rows.reduce((a, r) => a + Math.abs(r.drift), 0) / rows.length;
  });

  protected readonly avgDriftAfter = computed(() => {
    const newTotal = this.total() + this.totalSpent();
    if (!newTotal) return 0;
    const rows = this.normalized();
    if (!rows.length) return 0;
    return rows.reduce((a, r) => {
      const spent  = this.qty(r.eur, r.e.price) * r.e.price;
      const newPct = ((etfValue(r.e) + spent) / newTotal) * 100;
      return a + Math.abs(newPct - r.target);
    }, 0) / rows.length;
  });

  private readonly tauxChangeService = inject(TauxChangeService);
  // TAUXCHANGE-aware: converts EUR-base amounts into the display currency.
  protected readonly fmtEur = (n: number, d = 2): string => this.tauxChangeService.fmt(n, d);
  protected readonly fmtNum    = fmtNum;
  protected readonly fmtPctRaw = fmtPctRaw;

  protected qty(eur: number, price: number)  { return price > 0 ? Math.floor(eur / price) : 0; }
  protected cost(eur: number, price: number) { return this.qty(eur, price) * price; }

  // « Exécuter maintenant » : confirmation en deux temps, puis création d'un
  // achat par ligne de la répartition suggérée (quantités entières uniquement).
  protected readonly confirmingExecute = signal(false);
  protected readonly executing         = signal(false);

  /** Lignes réellement exécutables : au moins une part entière à acheter. */
  protected readonly executableRows = computed(() =>
    this.normalized()
      .map(r => ({ isin: r.e.isin, ticker: r.e.ticker, qty: this.qty(r.eur, r.e.price), price: r.e.price }))
      .filter(r => r.qty > 0),
  );

  protected async executePlan(): Promise<void> {
    if (this.executing()) return;
    const env  = this.selectedEnvelope();
    const rows = this.executableRows();
    if (!env || rows.length === 0) {
      this.toasts.error('Aucune part entière à acheter avec ce montant.');
      return;
    }
    if (!this.confirmingExecute()) {
      this.confirmingExecute.set(true);
      return;
    }

    this.executing.set(true);
    const today = new Date().toISOString().slice(0, 10);
    let created = 0;
    try {
      for (const r of rows) {
        const amount = r.qty * r.price;
        await this.transactionService.create({
          envelopeId: env.id,
          etfIsin:    r.isin,
          type:       'BUY',
          date:       today,
          quantity:   r.qty,
          price:      r.price,
          fees:       brokerageFee(amount),
          taxes:      0,
          amount,
        });
        created++;
      }
      this.toasts.success(`${created} achat${created > 1 ? 's' : ''} créé${created > 1 ? 's' : ''} — ${this.fmtEur(this.totalSpent(), 2)} investis sur ${env.code}.`);
    } catch (err) {
      console.error(err);
      this.toasts.error(created > 0
        ? `Erreur après ${created} achat${created > 1 ? 's' : ''} créé${created > 1 ? 's' : ''} — vérifie le journal avant de relancer.`
        : 'Erreur lors de la création des achats.');
    } finally {
      this.executing.set(false);
      this.confirmingExecute.set(false);
    }
  }

  protected cancelExecute(): void { this.confirmingExecute.set(false); }

  protected async savePlan(): Promise<void> {
    const env = this.selectedEnvelope();
    if (!env) return;

    const allocations: Record<string, number> = {};
    for (const r of this.normalized()) {
      if (r.eur > 0) allocations[r.e.isin] = r.eur;
    }

    try {
      await this.dcaPlanService.create({
        envelopeId: env.id,
        amount: this.amount(),
        frequency: 'MONTHLY',
        dayOfMonth: this.dayOfMonth(),
        allocations,
      });
      this.toasts.success('Plan DCA mensuel programmé.');
    } catch (err) {
      console.error(err);
      this.toasts.error('Erreur lors de la sauvegarde.');
    }
  }

  protected async deletePlan(id: string): Promise<void> {
    if (!confirm('Supprimer ce plan DCA ?')) return;
    try {
      await this.dcaPlanService.remove(id);
    } catch (err) {
      console.error(err);
    }
  }
}
