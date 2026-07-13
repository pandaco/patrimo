import { httpResource } from '@angular/common/http';
import { Injectable, inject, computed } from '@angular/core';
import { AuditLogEntryDto } from '@patrimo/contracts';
import { API_BASE_URL } from './api-base-url';
import { safeValue } from './safe';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<AuditLogEntryDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/audit-log` : undefined),
    { defaultValue: [] },
  );

  readonly all     = computed(() => safeValue(this.resource, []));
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  reload(): void { this.resource.reload(); }
}
