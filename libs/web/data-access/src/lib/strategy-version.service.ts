import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CreateStrategyVersionDto, StrategyVersionDto } from '@patrimo/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class StrategyVersionService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth    = inject(AuthService);

  private readonly resource = httpResource<StrategyVersionDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/strategy-versions` : undefined),
    { defaultValue: [] },
  );

  readonly all     = this.resource.value as unknown as () => StrategyVersionDto[];
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;

  reload(): void { this.resource.reload(); }

  async create(input: CreateStrategyVersionDto): Promise<StrategyVersionDto> {
    const created = await firstValueFrom(
      this.http.post<StrategyVersionDto>(`${this.baseUrl}/strategy-versions`, input),
    );
    // Newest first — prepend.
    this.resource.update(list => [created, ...(list ?? [])]);
    return created;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/strategy-versions/${id}`));
    this.resource.update(list => (list ?? []).filter(x => x.id !== id));
  }
}
