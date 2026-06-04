import { httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AlertDto } from 'contracts';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
import { Alert } from './models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<AlertDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/alerts` : undefined),
    { defaultValue: [] },
  );

  readonly all     = this.resource.value as unknown as () => Alert[];
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  reload(): void { this.resource.reload(); }
}
