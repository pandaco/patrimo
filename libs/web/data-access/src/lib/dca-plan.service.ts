import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject, computed } from '@angular/core';
import { CreateDcaPlanDto, DcaPlanDto, UpdateDcaPlanDto } from '@patrimo/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { safeValue } from './safe';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DcaPlanService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<DcaPlanDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/dca-plans` : undefined),
    { defaultValue: [] },
  );

  readonly all     = computed(() => safeValue(this.resource, []));
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  reload(): void { this.resource.reload(); }

  async create(input: CreateDcaPlanDto): Promise<DcaPlanDto> {
    const created = await firstValueFrom(this.http.post<DcaPlanDto>(`${this.baseUrl}/dca-plans`, input));
    this.resource.update(list => [...(list ?? []), created]);
    return created;
  }

  async update(id: string, input: UpdateDcaPlanDto): Promise<DcaPlanDto> {
    const updated = await firstValueFrom(this.http.patch<DcaPlanDto>(`${this.baseUrl}/dca-plans/${id}`, input));
    this.resource.update(list => (list ?? []).map(x => x.id === id ? updated : x));
    return updated;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/dca-plans/${id}`));
    this.resource.update(list => (list ?? []).filter(x => x.id !== id));
  }
}
