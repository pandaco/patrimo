import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

/**
 * Catch the `TokenError: invalid_grant` (and any other OAuth2 token-exchange
 * failure) thrown from Passport's google strategy when the authorization code
 * is expired, reused (browser back button after a successful login, or the
 * callback hit twice), or otherwise rejected by Google. Instead of letting
 * NestJS serialise the error as a 500 JSON payload that the browser cannot
 * react to, send the user back to `/login` with a short error code in the
 * query string.
 */
@Catch()
export class GoogleAuthFilter implements ExceptionFilter {
  private readonly logger = new Logger('GoogleAuth');

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.warn(`OAuth callback failed for ${req.url}: ${message}`);

    const frontend = (req.app.get('frontend-url') as string)
      || this.config.get<string>('FRONTEND_URL', 'http://localhost:4200').split(',')[0].trim();
    res.redirect(`${frontend}/login?error=oauth_failed`);
  }
}
