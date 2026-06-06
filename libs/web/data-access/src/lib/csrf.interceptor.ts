import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { CsrfService } from './csrf.service';

const UNSAFE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Double-submit CSRF token, header-based variant.
 *
 * - Reads the current token from `CsrfService` (populated by the previous
 *   server response) and echoes it back in the `X-CSRF-Token` header on
 *   every state-changing request to the API.
 * - Pipes API responses through `csrf.setFromResponse(...)` so the cached
 *   token rotates if the backend ever issues a new one (e.g. after session
 *   refresh).
 *
 * Cross-origin friendly: relies on the response header (exposed via CORS),
 * not on a JS-readable cookie. Works the same way in dev (:4200 / :3333)
 * and prod (single domain).
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(API_BASE_URL);
  const csrf    = inject(CsrfService);

  const sameApi = req.url.startsWith(baseUrl) || req.url.startsWith('/api');
  if (!sameApi) return next(req);

  let outgoing = req;
  if (UNSAFE_METHODS.has(req.method.toUpperCase())) {
    const token = csrf.current();
    if (token) outgoing = req.clone({ setHeaders: { [CSRF_HEADER_NAME]: token } });
  }

  return next(outgoing).pipe(
    tap((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse) csrf.setFromResponse(event.headers);
    }),
  );
};
