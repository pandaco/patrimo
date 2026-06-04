import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loggedOutGuard } from './guards/logged-out.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [loggedOutGuard],
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth-callback/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'wealth',
        loadComponent: () =>
          import('./features/wealth/wealth.component').then(
            (m) => m.WealthComponent,
          ),
      },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('./features/portfolio/portfolio.component').then(
            (m) => m.PortfolioComponent,
          ),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/transactions/transactions.component').then(
            (m) => m.TransactionsComponent,
          ),
      },
      {
        path: 'allocation',
        loadComponent: () =>
          import('./features/allocation/allocation.component').then(
            (m) => m.AllocationComponent,
          ),
      },
      {
        path: 'performance',
        loadComponent: () =>
          import('./features/performance/performance.component').then(
            (m) => m.PerformanceComponent,
          ),
      },
      {
        path: 'tools/dca',
        loadComponent: () =>
          import('./features/dca/dca.component').then((m) => m.DcaComponent),
      },
      {
        path: 'tools/calendar',
        loadComponent: () =>
          import('./features/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
      },
      {
        path: 'tools/compare',
        loadComponent: () =>
          import('./features/compare/compare.component').then(
            (m) => m.CompareComponent,
          ),
      },
      {
        path: 'tools/alerts',
        loadComponent: () =>
          import('./features/alerts/alerts.component').then(
            (m) => m.AlertsComponent,
          ),
      },
      {
        path: 'tools/glossary',
        loadComponent: () =>
          import('./features/glossary/glossary.component').then(
            (m) => m.GlossaryComponent,
          ),
      },
      {
        path: 'settings/preferences',
        loadComponent: () =>
          import('./features/preferences/preferences.component').then(
            (m) => m.PreferencesComponent,
          ),
      },
    ],
  },
];
