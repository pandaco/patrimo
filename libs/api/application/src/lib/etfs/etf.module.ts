import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { EtfController } from './etf.controller';
import { EtfService } from './etf.service';

@Module({
  imports: [PersistenceModule, AuthModule, MarketModule],
  controllers: [EtfController],
  providers: [EtfService],
})
export class EtfModule {}
