import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DcaPlanService, DividendService, EnvelopeService, EtfService, FxService, IncomeService, TransactionService } from '@patrimo/data-access';
import { DcaPlanDto, DividendDto } from '@patrimo/contracts';

type EventType = 'DIV' | 'MARK' | 'DCA';

interface CalEvent {
  date: string;             // ISO YYYY-MM-DD
  type: EventType;
  label: string;
  envCode: string;          // envelope code shown in the cell
  amount: number | null;    // null for non-cash events (milestones)
  past: boolean;            // event already happened
}

interface CalCell  { day?: number; event?: CalEvent }
interface CalMonth { y: number; m: number; label: string; events: CalEvent[]; cells: CalCell[] }

const MONTH_LABELS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function eventColor(t: string): string {
  return ({ DIV: 'var(--gain)', MARK: 'var(--warn)', DCA: 'var(--brand)' } as Record<string, string>)[t] ?? '#999';
}

function buildGrid(y: number, m: number, events: CalEvent[]): CalCell[] {
  // m is 1-based month. ISO weekday: Monday = 0.
  const firstDay = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days     = new Date(y, m, 0).getDate();
  const cells: CalCell[] = Array.from({ length: firstDay }, () => ({}));
  for (let d = 1; d <= days; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, event: events.find(e => e.date === dateStr) });
  }
  return cells;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [],
  templateUrl: './calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  private readonly transactionService  = inject(TransactionService);
  private readonly envelopeService = inject(EnvelopeService);
  private readonly etfService = inject(EtfService);
  private readonly dividendService = inject(DividendService);
  private readonly dcaPlanService = inject(DcaPlanService);
  private readonly incomeService = inject(IncomeService);

  /** Forward income + yield-on-cost per distributing position. */
  protected readonly income = this.incomeService.forecast;

  protected readonly weekDays = ['L','M','M','J','V','S','D'];

  /**
   * How many months the displayed window is shifted from "today-centred".
   * 0 = the default ±3-month window around the current month; the prev/next
   * controls move it freely, "Aujourd'hui" snaps it back.
   */
  private readonly monthOffset = signal(0);

  /**
   * Window: 7 months wide (3 before → 3 after the centre month), on month
   * boundaries. The centre is the current month shifted by `monthOffset`.
   * Re-derived as a computed so the user keeps seeing a relevant window even
   * if the SPA stays open for days, and so it tracks the offset signal.
   */
  private readonly windowMonths = computed(() => {
    const today  = new Date();
    const offset = this.monthOffset();
    const months: { y: number; m: number; label: string }[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + offset + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      // Hide the year only when the window still sits inside the current year
      // (offset 0); once navigated away, show it on every cell to avoid ambiguity.
      const showYear = offset !== 0 || y !== today.getFullYear();
      months.push({ y, m: m + 1, label: `${MONTH_LABELS_FR[m]} ${showYear ? y : ''}`.trim() });
    }
    return months;
  });

  /** True when the window is in its default today-centred position. */
  protected readonly atToday = computed(() => this.monthOffset() === 0);

  /** "Mars 2026 – Septembre 2026" — the span the grid currently shows. */
  protected readonly windowRangeLabel = computed(() => {
    const w = this.windowMonths();
    const first = w[0];
    const last  = w[w.length - 1];
    return `${MONTH_LABELS_FR[first.m - 1]} ${first.y} – ${MONTH_LABELS_FR[last.m - 1]} ${last.y}`;
  });

  protected shiftWindow(delta: number): void { this.monthOffset.update(o => o + delta); }
  protected resetWindow(): void { this.monthOffset.set(0); }

  private readonly etfByIsin = computed(() => {
    const map = new Map<string, string>();
    for (const e of this.etfService.all()) map.set(e.isin, e.ticker);
    return map;
  });

  private readonly envById = computed(() => {
    const map = new Map<string, { code: string; openedAt: string }>();
    for (const e of this.envelopeService.all()) map.set(e.id, { code: e.code, openedAt: e.openedAt });
    return map;
  });

  private readonly today = new Date().toISOString().slice(0, 10);

  /** Past dividend events derived from the user's transaction history + upcoming from API. */
  private readonly dividendEvents = computed<CalEvent[]>(() => {
    const tickers = this.etfByIsin();
    const envs    = this.envById();

    const past = this.transactionService.all()
      .filter(tx => tx.type === 'DIVIDEND' && tx.etf)
      .map(tx => {
        const ticker = (tx.etf && tickers.get(tx.etf)) || (tx.etf ?? '');
        const env    = envs.get(tx.envelope);
        return {
          date: tx.date,
          type: 'DIV' as const,
          label: `Dividende ${ticker} · ${this.fmtEur(tx.amount, 2)}`,
          envCode: env?.code ?? '',
          amount: tx.amount,
          past: true,
        };
      });

    const upcoming = this.dividendService.upcoming().map((d: DividendDto) => ({
      date: d.date,
      type: 'DIV' as const,
      label: `Dividende ${d.ticker} · ${this.fmtEur(d.amount, 2)} (est.)`,
      envCode: '?',
      amount: d.amount,
      past: false,
    }));

    return [...past, ...upcoming];
  });

  /**
   * Envelope milestones. For now, the only one we can derive automatically
   * is the PEA / PEA-PME 5-year anniversary (after which withdrawals do not
   * close the plan). Surface it inside the current window only.
   */
  private readonly milestoneEvents = computed<CalEvent[]>(() => {
    const window = this.windowMonths();
    const first  = window[0];
    const last   = window[window.length - 1];
    const lo     = `${first.y}-${String(first.m).padStart(2, '0')}-01`;
    const hi     = `${last.y}-${String(last.m).padStart(2, '0')}-31`;

    const events: CalEvent[] = [];
    for (const env of this.envelopeService.all()) {
      if (env.code !== 'PEA' && env.code !== 'PEA-PME') continue;
      const opened = new Date(env.openedAt);
      const anniversary = new Date(opened);
      anniversary.setFullYear(anniversary.getFullYear() + 5);
      const iso = anniversary.toISOString().slice(0, 10);
      if (iso >= lo && iso <= hi) {
        events.push({
          date: iso,
          type: 'MARK',
          label: `${env.code} atteint 5 ans · retraits possibles`,
          envCode: env.code,
          amount: null,
          past: iso <= this.today,
        });
      }
    }
    return events;
  });

  private readonly allEvents = computed<CalEvent[]>(() => {
    const dcaEvents: CalEvent[] = [];
    const envs = this.envById();
    const plans = this.dcaPlanService.all().filter((p: DcaPlanDto) => p.active);
    const window = this.windowMonths();
    const first  = window[0];
    const last   = window[window.length - 1];
    const lo     = `${first.y}-${String(first.m).padStart(2, '0')}-01`;
    const hi     = `${last.y}-${String(last.m).padStart(2, '0')}-31`;

    for (const plan of plans as DcaPlanDto[]) {
      const d = new Date(plan.nextExecution);
      const hiDate = new Date(hi);
      while (d <= hiDate) {
        const iso = d.toISOString().slice(0, 10);
        if (iso >= lo && iso <= hi) {
          const env = envs.get(plan.envelopeId);
          dcaEvents.push({
            date: iso,
            type: 'DCA',
            label: `DCA Mensuel`,
            envCode: env?.code ?? '?',
            amount: plan.amount,
            past: false,
          });
        }
        d.setMonth(d.getMonth() + 1);
      }
    }

    return [
      ...this.dividendEvents(),
      ...this.milestoneEvents(),
      ...dcaEvents,
    ];
  });

  protected readonly months = computed<CalMonth[]>(() =>
    this.windowMonths().map(({ y, m, label }) => {
      const events = this.allEvents().filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === y && d.getMonth() === m - 1;
      });
      return { y, m, label, events, cells: buildGrid(y, m, events) };
    }),
  );

  protected readonly divTotalPast = computed(() =>
    this.dividendEvents().filter(e => e.past).reduce((a, e) => a + (e.amount ?? 0), 0),
  );

  protected readonly divCount = computed(() =>
    this.dividendEvents().filter(e => e.past).length,
  );

  protected readonly milestoneCount = computed(() => this.milestoneEvents().length);

  protected readonly selectedEvent = signal<CalEvent | null>(null);

  protected selectCell(event: CalEvent | undefined): void {
    if (!event) return;
    this.selectedEvent.update((prev: CalEvent | null) => prev?.date === event.date && prev?.label === event.label ? null : event);
  }

  protected closePopover(): void { this.selectedEvent.set(null); }

  // --- Payments report (Portfolio Performance-style) -----------------------

  /** DIVIDEND + INTEREST grouped by calendar year, newest first. */
  protected readonly paymentYears = computed(() => {
    const byYear = new Map<number, { dividends: number; interest: number; count: number }>();
    for (const t of this.transactionService.all()) {
      if (t.type !== 'DIVIDEND' && t.type !== 'INTEREST') continue;
      const year = Number(t.date.slice(0, 4));
      const acc  = byYear.get(year) ?? { dividends: 0, interest: 0, count: 0 };
      if (t.type === 'DIVIDEND') acc.dividends += t.amount;
      else                       acc.interest  += t.amount;
      acc.count++;
      byYear.set(year, acc);
    }
    return Array.from(byYear.entries())
      .map(([year, v]) => ({ year, ...v, total: v.dividends + v.interest }))
      .sort((a, b) => b.year - a.year);
  });

  /** Current-year payments broken down by source (ETF ticker or envelope). */
  protected readonly paymentsBySource = computed(() => {
    const year = String(new Date().getFullYear());
    const bySource = new Map<string, number>();
    for (const t of this.transactionService.all()) {
      if (t.type !== 'DIVIDEND' && t.type !== 'INTEREST') continue;
      if (!t.date.startsWith(year)) continue;
      const source = t.etf
        ? (this.etfByIsin().get(t.etf) ?? t.etf)
        : (this.envById().get(t.envelope)?.code ?? 'Livrets');
      bySource.set(source, (bySource.get(source) ?? 0) + t.amount);
    }
    return Array.from(bySource.entries())
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total);
  });

  /** Trailing-12-months income — a simple annual run-rate. */
  protected readonly incomeRunRate = computed(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    return this.transactionService.all()
      .filter(t => (t.type === 'DIVIDEND' || t.type === 'INTEREST') && new Date(t.date) >= cutoff)
      .reduce((a, t) => a + t.amount, 0);
  });

  protected readonly currentYear = new Date().getFullYear();

  private readonly fxService = inject(FxService);
  // FX-aware: converts EUR-base amounts into the display currency.
  protected readonly fmtEur = (n: number, d = 2): string => this.fxService.fmt(n, d);
  protected readonly eventColor = eventColor;
}
