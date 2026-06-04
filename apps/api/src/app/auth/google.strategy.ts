import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthUser } from './types';
import { UserStoreService } from './user-store.service';

function makeInitials(firstName: string, lastName: string): string {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  return (first + last) || first || '?';
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly allowedEmails: Set<string>;

  constructor(config: ConfigService, private readonly users: UserStoreService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['openid', 'email', 'profile'],
    });
    const raw = config.get<string>('GOOGLE_ALLOWED_EMAILS', '');
    this.allowedEmails = new Set(
      raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    );
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) return done(new UnauthorizedException('No email on Google profile'));

    if (this.allowedEmails.size > 0 && !this.allowedEmails.has(email)) {
      return done(new UnauthorizedException('Email not allowed'));
    }

    const firstName = profile.name?.givenName ?? '';
    const lastName  = profile.name?.familyName ?? '';
    const user: AuthUser = this.users.upsertFromGoogle({
      googleId: profile.id,
      email,
      name: profile.displayName || `${firstName} ${lastName}`.trim() || email,
      firstName,
      lastName,
      initials: makeInitials(firstName, lastName),
      picture: profile.photos?.[0]?.value,
    });
    done(null, user);
  }
}
