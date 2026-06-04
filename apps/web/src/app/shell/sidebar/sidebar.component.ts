import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, UserService } from 'data-access';
import { AppIconComponent, AppIconName } from 'ui';

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: AppIconName;
  shortcut?: string;
  badge?: string;
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
      { id: 'tx',        label: 'Transactions',    route: '/transactions', icon: 'tx',        shortcut: 'T', badge: '13' },
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
      { id: 'alerts',    label: 'Alertes',         route: '/tools/alerts',   icon: 'alert',     shortcut: 'A', badge: '5' },
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

  protected readonly nav = NAV;
  protected readonly user = inject(UserService).currentUser;

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
