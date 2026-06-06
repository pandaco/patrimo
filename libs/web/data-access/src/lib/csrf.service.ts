import { Injectable, signal } from '@angular/core';

/**
 * Caches the current CSRF token captured from `X-CSRF-Token` response
 * headers. The backend's `CsrfMiddleware` sets the header on every response;
 * the `csrfInterceptor` pipes responses through `setFromResponse`. State-
 * changing requests then read `current()` and echo it back in the request
 * header for the backend to validate.
 *
 * In dev the SPA and the API live on different ports (4200 / 3333), so the
 * cookie that the backend sets is not readable by `document.cookie`. The
 * exposed response header sidesteps that: it works the same way in dev and
 * prod, and CORS already allows it via `exposedHeaders`.
 */
@Injectable({ providedIn: 'root' })
export class CsrfService {
  readonly current = signal<string | null>(null);

  setFromResponse(headers: { get(name: string): string | null }): void {
    const token = headers.get('X-CSRF-Token') ?? headers.get('x-csrf-token');
    if (token && token !== this.current()) this.current.set(token);
  }
}
