import { Module } from '@nestjs/common';
import { PersistenceModule } from 'infrastructure';
import { AuthModule } from '../auth/auth.module';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
})
export class PreferencesModule {}
