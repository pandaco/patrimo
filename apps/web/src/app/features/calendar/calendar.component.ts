import { ChangeDetectionStrategy, Component } from '@angular/core';
import { fmtEur } from 'ui';

interface CalEvent { date: string; type: 'DIV' | 'DCA' | 'MARK'; label: string; env: string }
interface CalCell  { day?: number; event?: CalEvent }
interface CalMonth { y: number; m: number; label: string; events: CalEvent[]; cells: CalCell[] }

const EVENTS: CalEvent[] = [
  { date:'2026-05-20', type:'DCA',  label:'DCA Core 500 €',                        env:'pea' },
  { date:'2026-05-28', type:'DIV',  label:'Dividende IWDA · ~19,40 €',             env:'cto' },
  { date:'2026-06-05', type:'DCA',  label:'DCA Core 500 €',                        env:'pea' },
  { date:'2026-06-15', type:'DIV',  label:'Dividende IWDA · 19,40 €',              env:'cto' },
  { date:'2026-06-28', type:'DIV',  label:'Dividende OBLI · 14,20 €',              env:'pea' },
  { date:'2026-07-02', type:'DIV',  label:'Dividende IWDA · 20,10 €',              env:'cto' },
  { date:'2026-07-05', type:'DCA',  label:'DCA Core 500 €',                        env:'pea' },
  { date:'2026-07-15', type:'DCA',  label:'DCA Satellite 300 €',                   env:'cto' },
  { date:'2026-08-05', type:'DCA',  label:'DCA Core 500 €',                        env:'pea' },
  { date:'2026-08-12', type:'MARK', label:'PEA atteint 5 ans · retraits possibles',env:'pea' },
  { date:'2026-08-15', type:'DIV',  label:'Dividende RS2K · 4,20 €',               env:'cto' },
  { date:'2026-09-05', type:'DCA',  label:'DCA Core 500 €',                        env:'pea' },
  { date:'2026-09-30', type:'DIV',  label:'Dividende IWDA · 21,60 €',              env:'cto' },
];

function eventColor(t: string): string {
  return ({ DIV: 'var(--gain)', DCA: 'var(--brand)', MARK: 'var(--warn)' } as Record<string, string>)[t] ?? '#999';
}

function buildGrid(y: number, m: number, events: CalEvent[]): CalCell[] {
  const firstDay = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days     = new Date(y, m, 0).getDate();
  const cells: CalCell[] = Array.from({ length: firstDay }, () => ({}));
  for (let d = 1; d <= days; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, event: events.find(e => e.date === dateStr) });
  }
  return cells;
}

function buildMonths(): CalMonth[] {
  const defs = [
    { y:2026, m:5, label:'Mai' }, { y:2026, m:6, label:'Juin' }, { y:2026, m:7, label:'Juillet' },
    { y:2026, m:8, label:'Août' }, { y:2026, m:9, label:'Septembre' },
  ];
  return defs.map(({ y, m, label }) => {
    const events = EVENTS.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === y && d.getMonth() === m - 1;
    });
    return { y, m, label, events, cells: buildGrid(y, m, events) };
  });
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [],
  templateUrl: './calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  protected readonly months   = buildMonths();
  protected readonly weekDays = ['L','M','M','J','V','S','D'];

  protected readonly divTotal = EVENTS.filter(e => e.type === 'DIV').reduce((a, e) => {
    const m = e.label.match(/([0-9,]+) €/);
    return a + (m ? parseFloat(m[1].replace(',', '.')) : 0);
  }, 0);
  protected readonly dcaTotal = EVENTS.filter(e => e.type === 'DCA').reduce((a, e) => {
    const m = e.label.match(/([0-9]+) €/);
    return a + (m ? parseFloat(m[1]) : 0);
  }, 0);

  protected readonly fmtEur = fmtEur;
  protected readonly eventColor = eventColor;
}
