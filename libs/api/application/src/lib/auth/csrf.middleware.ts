import { Injectable, Logger, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Double-submit-cookie CSRF protection.
 *
 * On every request: ensure a `patrimo_csrf` cookie exists. The cookie value is
 * a 32-byte random token base64url-encoded. The cookie is intentionally NOT
 * `httpOnly` so the SPA can read it via `document.cookie` and echo it back in
 * the `X-CSRF-Token` header on every state-changing request.
 *
 * On unsafe HTTP methods (POST/PATCH/PUT/DELETE): the middleware compares the
 * header against the cookie via `timingSafeEqual`. A mismatch throws 401.
 *
 * Routes that legitimately accept a state-changing request without a header
 * (the Google OAuth callback comes from Google's host, not our SPA) are
 * exempted at the path level.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_NAME = 'patrimo_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Paths that must be allowed to mutate without a CSRF token because the
// caller is not the SPA. The Google callback is a redirect from Google's
// host carrying the OAuth code in the query string — no opportunity to set
// a header. Keep this list short and routed under `/auth/*` only.
const EXEMPT_PATHS = new Set([
  '/api/auth/google',
  '/api/auth/google/callback',
]);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private readonly cookieOptions: CookieOptions;

  constructor(config: ConfigService) {
    const isProd = config.get<string>('NODE_ENV') === 'production';
    this.cookieOptions = {
      httpOnly: false,                  // SPA must read it
      secure:   isProd,
      sameSite: 'lax',
      path:     '/',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    };
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const existing = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE_NAME];
    let token = existing;
    if (!token) {
      token = randomBytes(32).toString('base64url');
      res.cookie(CSRF_COOKIE_NAME, token, this.cookieOptions);
    }

    // Echo the token in a response header on every request. The frontend
    // cannot read `document.cookie` cross-origin (SPA on :4200, API on :3333
    // in dev) so the SPA's `CsrfService` captures it from the response
    // header instead. CORS `exposedHeaders` must include `X-CSRF-Token`.
    res.setHeader('X-CSRF-Token', token);

    if (SAFE_METHODS.has(req.method)) return next();
    if (EXEMPT_PATHS.has(req.path))   return next();

    const sent = req.header(CSRF_HEADER_NAME);
    if (!sent || !this.constantTimeEquals(sent, token)) {
      this.logger.warn(`CSRF token mismatch on ${req.method} ${req.path}`);
      throw new UnauthorizedException('CSRF token mismatch');
    }
    next();
  }

  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
