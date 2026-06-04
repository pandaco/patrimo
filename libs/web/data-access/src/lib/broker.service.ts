import { Injectable, signal } from '@angular/core';
import { Broker } from './models';
import { MOCK_BROKERS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class BrokerService {
  readonly all = signal<Broker[]>(MOCK_BROKERS);
}
