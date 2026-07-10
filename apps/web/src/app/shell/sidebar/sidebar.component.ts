import { ChangeDetectionStrategy, Component, computed, inject, output, signal, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AlertService, AuthService, PreferencesService, TransactionService, UserService } from '@patrimo/data-access';
import { AppIconComponent, AppIconName } from '@patrimo/ui';

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

// Beginner-friendly nav: 5 entries instead of 12, plain-French labels.
const NAV_SIMPLE: NavGroup[] = [
  {
    label: 'Essentiel',
    items: [
      { id: 'dashboard', label: 'Mon patrimoine',  route: '/dashboard',      icon: 'dashboard', shortcut: 'D' },
      { id: 'tx',        label: 'Mes opérations',  route: '/transactions',   icon: 'tx',        shortcut: 'T' },
      { id: 'alloc',     label: 'Mon plan',        route: '/allocation',     icon: 'alloc',     shortcut: 'L' },
      { id: 'tips',      label: 'Conseils',        route: '/tools/tips',     icon: 'glossary',  shortcut: 'I' },
      { id: 'glossary',  label: 'Glossaire',       route: '/tools/glossary', icon: 'glossary',  shortcut: 'R' },
    ],
  },
];

const NAV: NavGroup[] = [
  {
    label: 'Aperçu',
    items: [
      { id: 'dashboard',   label: 'Tableau de bord', route: '/dashboard',   icon: 'dashboard', shortcut: 'D' },
      { id: 'wealth',      label: 'Patrimoine',       route: '/wealth',      icon: 'wealth',    shortcut: 'W' },
      { id: 'liabilities', label: 'Crédits',          route: '/liabilities', icon: 'liability' },
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
      { id: 'compare',   label: 'Comparateur',     route: '/tools/compare',  icon: 'compare',   shortcut: 'M' },
      { id: 'alerts',    label: 'Alertes',         route: '/tools/alerts',   icon: 'alert',     shortcut: 'A' },
      { id: 'glossary',  label: 'Glossaire',       route: '/tools/glossary', icon: 'glossary',  shortcut: 'R' },
      { id: 'tips',      label: 'Conseils',        route: '/tools/tips',     icon: 'glossary',  shortcut: 'I' },
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
  private readonly transactionService  = inject(TransactionService);
  private readonly alertService = inject(AlertService);
  private readonly preferences  = inject(PreferencesService);

  protected readonly uiMode = computed(() => this.preferences.current().uiMode);
  protected readonly nav    = computed(() => this.uiMode() === 'simple' ? NAV_SIMPLE : NAV);
  protected readonly user = inject(UserService).currentUser;
  protected readonly menuOpen = signal(false);

  private readonly txCount    = computed(() => this.transactionService.all().length);
  private readonly alertCount = this.alertService.unreadCount;

  protected badge(id: string): string | null {
    const value = id === 'tx'      ? this.txCount()
                : id === 'alerts'  ? this.alertCount()
                : null;
    return value && value > 0 ? String(value) : null;
  }

  protected toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(!this.menuOpen());
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected async toggleUiMode(): Promise<void> {
    const next = this.uiMode() === 'simple' ? 'expert' : 'simple';
    this.menuOpen.set(false);
    try {
      await this.preferences.update({ uiMode: next });
    } catch {
      // Preference save failed — nav simply stays as it was.
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
