import { Injectable, signal } from '@angular/core';
import { Exposure } from './models';
import { MOCK_EXPOSURE_GEO, MOCK_EXPOSURE_SECTOR, MOCK_EXPOSURE_CURR } from './mock-data';

@Injectable({ providedIn: 'root' })
export class ExposureService {
  readonly geo    = signal<Exposure[]>(MOCK_EXPOSURE_GEO);
  readonly sector = signal<Exposure[]>(MOCK_EXPOSURE_SECTOR);
  readonly curr   = signal<Exposure[]>(MOCK_EXPOSURE_CURR);
}
