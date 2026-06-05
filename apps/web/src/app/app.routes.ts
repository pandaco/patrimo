import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loggedOutGuard } from './guards/logged-out.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [loggedOutGuard],
    loadComponent: () =>
      import('features').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('features').then(
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
          import('features').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'wealth',
        loadComponent: () =>
          import('features').then(
            (m) => m.WealthComponent,
          ),
      },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('features').then(
            (m) => m.PortfolioComponent,
          ),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('features').then(
            (m) => m.TransactionsComponent,
          ),
      },
      {
        path: 'allocation',
        loadComponent: () =>
          import('features').then(
            (m) => m.AllocationComponent,
          ),
      },
      {
        path: 'performance',
        loadComponent: () =>
          import('features').then(
            (m) => m.PerformanceComponent,
          ),
      },
      {
        path: 'tools/dca',
        loadComponent: () =>
          import('features').then((m) => m.DcaComponent),
      },
      {
        path: 'tools/calendar',
        loadComponent: () =>
          import('features').then(
            (m) => m.CalendarComponent,
          ),
      },
      {
        path: 'tools/compare',
        loadComponent: () =>
          import('features').then(
            (m) => m.CompareComponent,
          ),
      },
      {
        path: 'tools/alerts',
        loadComponent: () =>
          import('features').then(
            (m) => m.AlertsComponent,
          ),
      },
      {
        path: 'tools/glossary',
        loadComponent: () =>
          import('features').then(
            (m) => m.GlossaryComponent,
          ),
      },
      {
        path: 'settings/preferences',
        loadComponent: () =>
          import('features').then(
            (m) => m.PreferencesComponent,
          ),
      },
    ],
  },
];
