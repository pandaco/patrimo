import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { GoogleAuthFilter } from './google-auth.filter';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { SessionUser } from './session-user.decorator';
import { UserStoreService } from './user-store.service';
import { AuthUser, SESSION_COOKIE_NAME } from './types';

@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;
  private readonly devLoginEnabled: boolean;

  constructor(
    private readonly sessions: SessionService,
    private readonly users: UserStoreService,
    config: ConfigService,
  ) {
    const isProd = config.get<string>('NODE_ENV') === 'production';
    this.cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      signed: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    // Dev-login is a known backdoor. Refuse to enable it unless BOTH
    // `NODE_ENV !== production` AND `ALLOW_DEV_LOGIN` is a truthy flag.
    // Accept the common truthy spellings ('true', 'TRUE', '1') so an ops
    // typing the env in caps doesn't silently get a 403 they can't debug.
    const flag = config.get<string>('ALLOW_DEV_LOGIN')?.toLowerCase();
    this.devLoginEnabled = !isProd && (flag === 'true' || flag === '1');
  }

  @Get('google')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(AuthGuard('google'))
  @UseFilters(GoogleAuthFilter)
  googleLogin(): void {
    // Guard initiates redirect to Google.
  }

  @Get('google/callback')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(AuthGuard('google'))
  @UseFilters(GoogleAuthFilter)
  async googleCallback(
    @Req() req: Request & { user: AuthUser },
    @Res() res: Response,
  ): Promise<void> {
    const sid = await this.sessions.create(req.user.id);
    res.cookie(SESSION_COOKIE_NAME, sid, this.cookieOptions);
    const frontend = (req.app.get('frontend-url') as string) || 'http://localhost:4200';
    res.redirect(`${frontend}/auth/callback`);
  }

  @Get('dev-login')
  // Generous on purpose: every Playwright test authenticates through here and
  // two browser projects run in parallel. The endpoint is already dev-gated
  // (403 unless NODE_ENV != production AND ALLOW_DEV_LOGIN=true), so the
  // throttle only guards against runaway loops, not abuse.
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async devLogin(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.devLoginEnabled) {
      throw new ForbiddenException('dev-login not enabled');
    }
    let user = await this.users.findByGoogleId('seed-dev-user');
    if (!user) {
      user = await this.users.upsertFromGoogle({
        googleId:  'seed-dev-user',
        email:     'dev@patrimo.local',
        name:      'Antoine Huet (seed)',
        firstName: 'Antoine',
        lastName:  'Huet',
        initials:  'AH',
      });
    }
    const sid = await this.sessions.create(user.id);
    res.cookie(SESSION_COOKIE_NAME, sid, this.cookieOptions);
    const frontend = (req.app.get('frontend-url') as string) || 'http://localhost:4200';
    res.redirect(`${frontend}/auth/callback`);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@SessionUser() user: AuthUser): AuthUser {
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const sid = req.signedCookies?.[SESSION_COOKIE_NAME];
    if (typeof sid === 'string') await this.sessions.destroy(sid);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.send();
  }
}
