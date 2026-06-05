import { ChangeDetectionStrategy, Component, HostListener, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertService, EtfService } from '@patrimo/data-access';
import { AppIconComponent, KeyboardShortcutService } from '@patrimo/ui';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [AppIconComponent, RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  crumbs = input.required<string[]>();
  newTransaction = output<void>();

  private readonly etfSvc   = inject(EtfService);
  private readonly alertSvc = inject(AlertService);
  private readonly kb       = inject(KeyboardShortcutService);

  protected readonly refreshing  = signal(false);
  protected readonly notifOpen   = signal(false);
  protected readonly unreadCount = this.alertSvc.unreadCount;
  protected readonly alerts      = this.alertSvc.all;

  protected openSearch(): void { this.kb.openSearch(); }

  protected async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    try {
      await this.etfSvc.forceRefresh();
    } finally {
      this.refreshing.set(false);
    }
  }

  protected async toggleNotif(): Promise<void> {
    const opening = !this.notifOpen();
    this.notifOpen.set(opening);
    if (opening && this.unreadCount() > 0) {
      await this.alertSvc.readAll();
    }
  }

  protected async dismiss(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    await this.alertSvc.dismiss(id);
  }

  protected sevClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : sev === 'loss' ? 'loss' : 'info';
  }

  @HostListener('document:keydown.escape')
  closeNotif(): void {
    this.notifOpen.set(false);
  }
}
