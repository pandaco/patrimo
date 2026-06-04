import { Injectable, signal } from '@angular/core';
import { Alert } from './models';
import { MOCK_ALERTS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class AlertService {
  readonly all = signal<Alert[]>(MOCK_ALERTS);
}
