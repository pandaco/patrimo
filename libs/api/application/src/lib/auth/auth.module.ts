import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthController } from './auth.controller';
import { CsrfMiddleware } from './csrf.middleware';
import { GoogleAuthFilter } from './google-auth.filter';
import { GoogleStrategy } from './google.strategy';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { UserStoreService } from './user-store.service';

@Module({
  imports: [PassportModule, PersistenceModule],
  controllers: [AuthController],
  providers: [GoogleStrategy, SessionService, SessionGuard, UserStoreService, GoogleAuthFilter, CsrfMiddleware],
  exports: [SessionService, SessionGuard, UserStoreService, CsrfMiddleware],
})
export class AuthModule {}
