import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { UserStoreService } from './user-store.service';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [GoogleStrategy, SessionService, SessionGuard, UserStoreService],
  exports: [SessionService, SessionGuard, UserStoreService],
})
export class AuthModule {}
