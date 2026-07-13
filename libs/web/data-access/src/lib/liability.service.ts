import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { CreateLiabilityDto, UpdateLiabilityDto } from '@patrimo/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
import { Liability } from './models';
import { safeValue } from './safe';

@Injectable({ providedIn: 'root' })
export class LiabilityService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<Liability[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/liabilities` : undefined),
    { defaultValue: [] },
  );

  readonly all     = computed(() => safeValue(this.resource, [] as Liability[]));
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  readonly total = computed(() => this.all().reduce((a, l) => a + l.currentBalance, 0));

  reload(): void { this.resource.reload(); }

  async create(input: CreateLiabilityDto): Promise<Liability> {
    const created = await firstValueFrom(
      this.http.post<Liability>(`${this.baseUrl}/liabilities`, input),
    );
    this.resource.update(list => [...list, created]);
    return created;
  }

  async update(id: string, input: UpdateLiabilityDto): Promise<Liability> {
    const updated = await firstValueFrom(
      this.http.patch<Liability>(`${this.baseUrl}/liabilities/${id}`, input),
    );
    this.resource.update(list => list.map(l => (l.id === id ? updated : l)));
    return updated;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/liabilities/${id}`));
    this.resource.update(list => list.filter(l => l.id !== id));
  }
}
