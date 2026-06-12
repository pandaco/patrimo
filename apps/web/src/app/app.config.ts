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
import { AuthService, GlossaryService, authInterceptor, csrfInterceptor } from '@patrimo/data-access';
import { GLOSSARY_LOOKUP } from '@patrimo/ui';
import { appRoutes } from './app.routes';

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
    provideHttpClient(withFetch(), withInterceptors([csrfInterceptor, authInterceptor])),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    // Contextual glossary: <ui-term> resolves definitions through this
    // lookup so the ui lib never depends on data-access.
    {
      provide: GLOSSARY_LOOKUP,
      useFactory: () => {
        const glossary = inject(GlossaryService);
        return (term: string) => glossary.find(term);
      },
    },
    // The data-access services back their list signals with `httpResource`s
    // gated on `AuthService.isAuthenticated()`, so the only thing we still
    // have to do at bootstrap is resolve the auth state once. The resources
    // then auto-fetch as soon as the gate flips true.
    provideAppInitializer(() => inject(AuthService).loadCurrentUser()),
  ],
};
