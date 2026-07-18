import { ChangeDetectionStrategy, Component, HostListener, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService, EtfService } from '@patrimo/data-access';
import { AppIconComponent, KeyboardShortcutService } from '@patrimo/ui';

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
  drawerOpen = input(false);
  newTransaction = output<void>();
  toggleDrawer = output<void>();

  private readonly etfService   = inject(EtfService);
  private readonly alertService = inject(AlertService);
  private readonly keyboardShortcuts = inject(KeyboardShortcutService);
  private readonly router = inject(Router);

  protected navigateToAlerts(event: Event): void {
    event.preventDefault();
    this.notifOpen.set(false);
    this.router.navigate(['/tools/alerts']);
  }

  protected readonly refreshing  = signal(false);
  protected readonly notifOpen   = signal(false);
  protected readonly unreadCount = this.alertService.unreadCount;
  protected readonly alerts      = this.alertService.all;

  protected openSearch(): void { this.keyboardShortcuts.openSearch(); }

  protected async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    try {
      await this.etfService.forceRefresh();
    } finally {
      this.refreshing.set(false);
    }
  }

  protected async toggleNotif(): Promise<void> {
    const opening = !this.notifOpen();
    this.notifOpen.set(opening);
    if (opening && this.unreadCount() > 0) {
      await this.alertService.readAll();
    }
  }

  protected async dismiss(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    await this.alertService.dismiss(id);
  }

  protected severityClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : sev === 'loss' ? 'loss' : 'info';
  }

  @HostListener('document:keydown.escape')
  closeNotif(): void {
    this.notifOpen.set(false);
  }
}
