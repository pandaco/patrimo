import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AppIconComponent, ToastComponent } from '@patrimo/ui';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { GModeBadgeComponent, KeyboardShortcutService } from '@patrimo/ui';

const CRUMB_MAP: Record<string, string[]> = {
  '/dashboard':      ['Aperçu',   'Tableau de bord'],
  '/wealth':         ['Aperçu',   'Patrimoine'],
  '/portfolio':      ['Investir', 'Portefeuille'],
  '/transactions':   ['Investir', 'Transactions'],
  '/allocation':     ['Investir', 'Allocation'],
  '/performance':    ['Investir', 'Performance'],
  '/tools/indicators': ['Outils', 'Indicateurs'],
  '/tools/dca':      ['Outils',   'DCA helper'],
  '/tools/calendar': ['Outils',   'Calendrier'],
  '/tools/compare':  ['Outils',   'Comparateur'],
  '/tools/alerts':   ['Outils',   'Alertes'],
  '/tools/glossary': ['Outils',   'Glossaire'],
  '/tools/tips':     ['Outils',   'Conseils'],
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarComponent, TopbarComponent, GModeBadgeComponent, AppIconComponent, ToastComponent],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly router = inject(Router);
  protected readonly keyboardShortcuts = inject(KeyboardShortcutService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly crumbs = computed(() => {
    const path = this.currentUrl().split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
    return CRUMB_MAP[path] ?? ['Patrimo'];
  });

  protected onNewTransaction(): void { this.keyboardShortcuts.openTx(); }
  protected onOpenShortcuts(): void  { this.keyboardShortcuts.openShortcuts(); }
}
