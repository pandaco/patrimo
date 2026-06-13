import { inject, Injectable, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { PortfolioExposureDto } from '@patrimo/contracts';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ExposureService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<PortfolioExposureDto>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/portfolio/exposure` : undefined),
  );

  readonly geo    = computed(() => this.resource.value()?.geo ?? []);
  readonly sector = computed(() => this.resource.value()?.sector ?? []);
  readonly curr   = computed(() => this.resource.value()?.currency ?? []);

  refresh() {
    this.resource.reload();
  }
}
