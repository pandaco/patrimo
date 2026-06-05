import { inject, Injectable, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { PortfolioExposureDto } from '@patrimo/contracts';

@Injectable({ providedIn: 'root' })
export class ExposureService {
  private readonly http = inject(HttpClient);

  private readonly resource = httpResource<PortfolioExposureDto>(() => '/api/portfolio/exposure');

  readonly geo    = computed(() => this.resource.value()?.geo ?? []);
  readonly sector = computed(() => this.resource.value()?.sector ?? []);
  readonly curr   = computed(() => this.resource.value()?.currency ?? []);

  refresh() {
    this.resource.reload();
  }
}
