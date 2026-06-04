import { Injectable, signal } from '@angular/core';
import { Targets } from './models';
import { MOCK_TARGETS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class AllocationService {
  readonly targets = signal<Targets>(MOCK_TARGETS);
}
