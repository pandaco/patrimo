import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loggedOutGuard } from './guards/logged-out.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [loggedOutGuard],
    loadComponent: () =>
      import('@patrimo/features').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('@patrimo/features').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    // Full-screen onboarding, outside the shell on purpose: no sidebar to
    // overwhelm a first-time user.
    path: 'welcome',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@patrimo/features').then((m) => m.WelcomeComponent),
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
          import('@patrimo/features').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'wealth',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.WealthComponent,
          ),
      },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.PortfolioComponent,
          ),
      },
      {
        path: 'liabilities',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.LiabilitiesComponent,
          ),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.TransactionsComponent,
          ),
      },
      {
        path: 'allocation',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.AllocationComponent,
          ),
      },
      {
        path: 'performance',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.PerformanceComponent,
          ),
      },
      {
        path: 'tools/indicators',
        loadComponent: () =>
          import('@patrimo/features').then((m) => m.IndicatorsComponent),
      },
      {
        path: 'tools/cashflow',
        loadComponent: () =>
          import('@patrimo/features').then((m) => m.CashflowComponent),
      },
      {
        path: 'tools/projection',
        loadComponent: () =>
          import('@patrimo/features').then((m) => m.ProjectionComponent),
      },
      {
        path: 'tools/report',
        loadComponent: () =>
          import('@patrimo/features').then((m) => m.ReportComponent),
      },
      {
        path: 'tools/dca',
        loadComponent: () =>
          import('@patrimo/features').then((m) => m.DcaComponent),
      },
      {
        path: 'tools/calendar',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.CalendarComponent,
          ),
      },
      {
        path: 'tools/compare',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.CompareComponent,
          ),
      },
      {
        path: 'tools/alerts',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.AlertsComponent,
          ),
      },
      {
        path: 'tools/glossary',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.GlossaryComponent,
          ),
      },
      {
        path: 'tools/tips',
        loadComponent: () =>
          import('@patrimo/features').then(
            (m) => m.TipsComponent,
          ),
      },
      {
        path: 'settings/preferences',
        loadComponent: () =>
          import('@patrimo/features').then((m) => m.PreferencesComponent),
      },
      {
        path: 'settings/allocation',
        loadComponent: () =>
          import('@patrimo/features').then((m) => m.AllocationSettingsComponent),
      },
    ],
  },
];
