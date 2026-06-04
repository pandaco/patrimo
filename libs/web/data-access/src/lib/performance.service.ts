import { Injectable, signal } from '@angular/core';
import { MOCK_PERF_SERIES } from './mock-data';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  readonly series = signal(MOCK_PERF_SERIES);
}
