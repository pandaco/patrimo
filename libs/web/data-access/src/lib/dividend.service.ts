import { inject, Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DividendDto } from '@patrimo/contracts';

@Injectable({ providedIn: 'root' })
export class DividendService {
  private readonly resource = httpResource<DividendDto[]>(() => '/api/portfolio/dividends');

  readonly upcoming = computed(() => this.resource.value() ?? []);

  refresh() {
    this.resource.reload();
  }
}

