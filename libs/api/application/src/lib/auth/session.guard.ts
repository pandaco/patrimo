import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from './session.service';
import { SESSION_COOKIE_NAME } from './types';
import { UserStoreService } from './user-store.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly users: UserStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const sid = req.signedCookies?.[SESSION_COOKIE_NAME];
    if (typeof sid !== 'string') throw new UnauthorizedException();

    const session = await this.sessions.get(sid);
    if (!session) throw new UnauthorizedException();

    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedException();

    (req as Request & { user?: unknown }).user = user;
    return true;
  }
}
