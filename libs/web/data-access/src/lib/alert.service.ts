import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { AlertDto, AlertRuleDto, CreateAlertRuleDto, UpdateAlertRuleDto } from '@patrimo/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
import { Alert } from './models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<AlertDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/alerts` : undefined),
    { defaultValue: [] },
  );

  private readonly rulesResource = httpResource<AlertRuleDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/alerts/rules` : undefined),
    { defaultValue: [] },
  );

  readonly all        = this.resource.value as unknown as () => Alert[];
  readonly loading    = this.resource.isLoading;
  readonly error      = this.resource.error;

  readonly rules      = this.rulesResource.value as unknown as () => AlertRuleDto[];

  readonly unreadCount = computed(() =>
    (this.resource.value() ?? []).filter(a => !a.read && !a.dismissed).length,
  );

  reload(): void { this.resource.reload(); }

  async dismiss(id: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/alerts/${encodeURIComponent(id)}/dismiss`, {}),
    );
    this.resource.reload();
  }

  async markRead(id: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/alerts/${encodeURIComponent(id)}/read`, {}),
    );
    this.resource.reload();
  }

  async readAll(): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/alerts/read-all`, {}),
    );
    this.resource.reload();
  }

  // --- Rules ---

  async createRule(input: CreateAlertRuleDto): Promise<void> {
    await firstValueFrom(this.http.post<AlertRuleDto>(`${this.baseUrl}/alerts/rules`, input));
    this.rulesResource.reload();
    this.resource.reload();
  }

  async updateRule(id: string, input: UpdateAlertRuleDto): Promise<void> {
    await firstValueFrom(this.http.patch<AlertRuleDto>(`${this.baseUrl}/alerts/rules/${id}`, input));
    this.rulesResource.reload();
    this.resource.reload();
  }

  async deleteRule(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/alerts/rules/${id}`));
    this.rulesResource.reload();
    this.resource.reload();
  }
}
