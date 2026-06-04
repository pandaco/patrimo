import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  inject,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { AuthService, EnvelopeService, EtfService, TransactionService } from 'data-access';
import { appRoutes } from './app.routes';
import { authInterceptor } from './shared/auth/auth.interceptor';

registerLocaleData(localeFr, 'fr-FR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideAppInitializer(async () => {
      const auth = inject(AuthService);
      await auth.loadCurrentUser();
      if (!auth.isAuthenticated()) return;
      const envelopes    = inject(EnvelopeService);
      const etfs         = inject(EtfService);
      const transactions = inject(TransactionService);
      // Non-fatal: feature pages render their empty state if any of these fail.
      await Promise.allSettled([
        envelopes.reload(),
        etfs.reload(),
        transactions.reload(),
      ]);
    }),
  ],
};
