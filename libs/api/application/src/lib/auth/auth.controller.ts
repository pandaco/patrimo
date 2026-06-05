import {
  Controller,
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
import type { CookieOptions, Request, Response } from 'express';
import { GoogleAuthFilter } from './google-auth.filter';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { SessionUser } from './session-user.decorator';
import { AuthUser, SESSION_COOKIE_NAME } from './types';

@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly sessions: SessionService,
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
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @UseFilters(GoogleAuthFilter)
  googleLogin(): void {
    // Guard initiates redirect to Google.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @UseFilters(GoogleAuthFilter)
  googleCallback(
    @Req() req: Request & { user: AuthUser },
    @Res() res: Response,
  ): void {
    const sid = this.sessions.create(req.user.id);
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
  logout(@Req() req: Request, @Res() res: Response): void {
    const sid = req.signedCookies?.[SESSION_COOKIE_NAME];
    if (typeof sid === 'string') this.sessions.destroy(sid);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.send();
  }
}
