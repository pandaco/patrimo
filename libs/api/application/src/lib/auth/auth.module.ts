import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PersistenceModule } from 'infrastructure';
import { AuthController } from './auth.controller';
import { GoogleAuthFilter } from './google-auth.filter';
import { GoogleStrategy } from './google.strategy';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { UserStoreService } from './user-store.service';

@Module({
  imports: [PassportModule, PersistenceModule],
  controllers: [AuthController],
  providers: [GoogleStrategy, SessionService, SessionGuard, UserStoreService, GoogleAuthFilter],
  exports: [SessionService, SessionGuard, UserStoreService],
})
export class AuthModule {}
