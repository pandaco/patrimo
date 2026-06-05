import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/core/http';
import { PortfolioExposureDto } from 'contracts';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExposureService {
  private readonly http = inject(HttpClient);

  private readonly resource = httpResource<PortfolioExposureDto>(() => '/api/portfolio/exposure');

  readonly geo    = this.resource.computed(() => this.resource.value()?.geo ?? []);
  readonly sector = this.resource.computed(() => this.resource.value()?.sector ?? []);
  readonly curr   = this.resource.computed(() => this.resource.value()?.currency ?? []);

  refresh() {
    this.resource.reload();
  }
}
