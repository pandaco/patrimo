import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EtfService } from 'data-access';
import { fmtPct, fmtPctRaw } from 'ui';

const COMPARE_TICKERS = ['ESE', 'CW8', 'PCEU', 'IWDA'];

const TRACKING = [
  { ticker:'ESE',   td:-0.02, te:0.08, fees:'0,99 €', boursoFees:'1,99 €', spread:'0,04 %', size:'12,8 Mds €', since:'2010', tco:'228 €' },
  { ticker:'CW8',   td:-0.18, te:0.21, fees:'0,99 €', boursoFees:'1,99 €', spread:'0,09 %', size:'2,1 Mds €',  since:'2015', tco:'412 €' },
  { ticker:'PCEU',  td: 0.04, te:0.06, fees:'0,99 €', boursoFees:'1,99 €', spread:'0,07 %', size:'1,4 Mds €',  since:'2018', tco:'268 €' },
  { ticker:'IWDA',  td:-0.06, te:0.12, fees:'—',       boursoFees:'1,99 €', spread:'0,03 %', size:'52,4 Mds €', since:'2009', tco:'318 €' },
];

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [],
  templateUrl: './compare.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareComponent {
  private readonly etfSvc = inject(EtfService);

  protected readonly candidates = computed(() =>
    this.etfSvc.all().filter(e => COMPARE_TICKERS.includes(e.ticker))
  );
  protected readonly tracking = TRACKING;

  protected readonly fmtPct    = fmtPct;
  protected readonly fmtPctRaw = fmtPctRaw;

  protected tdRow(ticker: string) { return TRACKING.find(t => t.ticker === ticker); }
}
