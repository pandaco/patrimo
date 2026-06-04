import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AlertService, AuthService, TransactionService, UserService } from 'data-access';
import { AppIconComponent, AppIconName } from 'ui';

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: AppIconName;
  shortcut?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: 'Aperçu',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', route: '/dashboard', icon: 'dashboard', shortcut: 'D' },
      { id: 'wealth',    label: 'Patrimoine',       route: '/wealth',    icon: 'wealth',    shortcut: 'W' },
    ],
  },
  {
    label: 'Investir',
    items: [
      { id: 'portfolio', label: 'Portefeuille',    route: '/portfolio',    icon: 'portfolio', shortcut: 'P' },
      { id: 'tx',        label: 'Transactions',    route: '/transactions', icon: 'tx',        shortcut: 'T' },
      { id: 'alloc',     label: 'Allocation',      route: '/allocation',   icon: 'alloc',     shortcut: 'L' },
      { id: 'perf',      label: 'Performance',     route: '/performance',  icon: 'perf',      shortcut: 'F' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { id: 'dca',       label: 'DCA helper',      route: '/tools/dca',      icon: 'dca' },
      { id: 'calendar',  label: 'Calendrier',      route: '/tools/calendar', icon: 'calendar',  shortcut: 'C' },
      { id: 'compare',   label: 'Comparateur ETF', route: '/tools/compare',  icon: 'compare',   shortcut: 'M' },
      { id: 'alerts',    label: 'Alertes',         route: '/tools/alerts',   icon: 'alert',     shortcut: 'A' },
      { id: 'glossary',  label: 'Glossaire',       route: '/tools/glossary', icon: 'glossary',  shortcut: 'R' },
    ],
  },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AppIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  openShortcuts = output<void>();

  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly txSvc  = inject(TransactionService);
  private readonly alertSvc = inject(AlertService);

  protected readonly nav  = NAV;
  protected readonly user = inject(UserService).currentUser;

  private readonly txCount    = computed(() => this.txSvc.all().length);
  private readonly alertCount = computed(() => this.alertSvc.all().length);

  protected badge(id: string): string | null {
    const value = id === 'tx'      ? this.txCount()
                : id === 'alerts'  ? this.alertCount()
                : null;
    return value && value > 0 ? String(value) : null;
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
