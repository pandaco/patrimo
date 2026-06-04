import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { EtfService } from 'data-access';
import { AppIconComponent } from 'ui';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  crumbs = input.required<string[]>();
  newTransaction = output<void>();

  private readonly etfSvc = inject(EtfService);

  protected readonly refreshing = signal(false);

  protected async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    try {
      await this.etfSvc.forceRefresh();
    } finally {
      this.refreshing.set(false);
    }
  }
}
