import { Module } from '@nestjs/common';
import { PersistenceModule } from 'infrastructure';
import { AuthModule } from '../auth/auth.module';
import { EtfController } from './etf.controller';
import { EtfService } from './etf.service';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [EtfController],
  providers: [EtfService],
})
export class EtfModule {}
