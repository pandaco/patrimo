import { inject, Injectable } from '@angular/core';
import { httpResource } from '@angular/core/http';
import { DividendDto } from 'contracts';

@Injectable({ providedIn: 'root' })
export class DividendService {
  private readonly resource = httpResource<DividendDto[]>(() => '/api/portfolio/dividends');

  readonly upcoming = this.resource.computed(() => this.resource.value() ?? []);

  refresh() {
    this.resource.reload();
  }
}

