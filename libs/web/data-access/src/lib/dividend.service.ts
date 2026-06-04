import { Injectable, signal } from '@angular/core';
import { Dividend } from './models';
import { MOCK_DIVIDENDS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class DividendService {
  readonly calendarEvents = signal<Dividend[]>(MOCK_DIVIDENDS);
}
