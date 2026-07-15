import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { A11yModule } from '@angular/cdk/a11y';
import { filter, map } from 'rxjs';
import { AppIconComponent, ToastComponent } from '@patrimo/ui';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { GModeBadgeComponent, KeyboardShortcutService } from '@patrimo/ui';

const CRUMB_MAP: Record<string, string[]> = {
  '/dashboard':      ['Aperçu',   'Tableau de bord'],
  '/wealth':         ['Aperçu',   'Patrimoine'],
  '/portfolio':      ['Investir', 'Portefeuille'],
  '/transactions':   ['Investir', 'Opérations'],
  '/allocation':     ['Investir', 'Allocation'],
  '/performance':    ['Investir', 'Performance'],
  '/tools/analyses/indicators': ['Outils', 'Analyses', 'Indicateurs'],
  '/tools/analyses/cashflow':   ['Outils', 'Analyses', 'Cash-flow'],
  '/tools/analyses/projection': ['Outils', 'Analyses', 'Projection'],
  '/tools/dca':      ['Outils',   'DCA helper'],
  '/tools/calendar': ['Outils',   'Calendrier & revenus'],
  '/tools/compare':  ['Outils',   'Comparateur'],
  '/tools/alerts':   ['Outils',   'Alertes'],
  '/tools/glossary': ['Outils',   'Glossaire'],
  '/tools/tips':     ['Outils',   'Conseils'],
};

// Must stay in sync with `md` in apps/web/src/styles/_breakpoints.scss —
// media queries cannot read Sass variables, so the value is mirrored here.
const COMPACT_QUERY = '(max-width: 900px)';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarComponent, TopbarComponent, GModeBadgeComponent, AppIconComponent, ToastComponent, A11yModule],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);
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

  // Below `md` the sidebar is an icon rail (or hidden); the drawer renders it
  // as a fixed overlay on demand. Above `md` the drawer concept is void.
  private readonly isCompact = toSignal(
    this.breakpoints.observe(COMPACT_QUERY).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly drawerOpen = signal(false);

  constructor() {
    // Any navigation closes the drawer (its links are plain routerLinks);
    // hand focus to the page content so it doesn't die inside hidden chrome.
    effect(() => {
      this.currentUrl();
      untracked(() => {
        if (this.drawerOpen()) {
          this.drawerOpen.set(false);
          document.getElementById('main')?.focus();
        }
      });
    });
    // Resizing back to desktop must not leave a stale overlay behind.
    effect(() => {
      if (!this.isCompact()) this.drawerOpen.set(false);
    });
  }

  protected toggleDrawer(): void {
    if (this.drawerOpen()) {
      this.closeDrawer();
    } else {
      this.drawerOpen.set(true);
    }
  }

  protected closeDrawer(): void {
    if (!this.drawerOpen()) return;
    this.drawerOpen.set(false);
    this.refocusDrawerTrigger();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDrawer();
  }

  // The sidebar is never destroyed (same node in rail and overlay modes), so
  // the focus trap has nothing to auto-restore — refocus whichever trigger
  // (topbar burger) is visible at the current width.
  private refocusDrawerTrigger(): void {
    const triggers = document.querySelectorAll<HTMLElement>('.burger');
    for (const trigger of Array.from(triggers)) {
      if (trigger.offsetParent !== null) {
        trigger.focus();
        return;
      }
    }
  }

  protected onNewTransaction(): void { this.keyboardShortcuts.openTx(); }
  protected onOpenShortcuts(): void  { this.keyboardShortcuts.openShortcuts(); }
}
