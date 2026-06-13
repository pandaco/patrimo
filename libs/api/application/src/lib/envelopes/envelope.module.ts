import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { EnvelopeController } from './envelope.controller';
import { EnvelopeService } from './envelope.service';

@Module({
  imports: [PersistenceModule, AuthModule, MarketModule],
  controllers: [EnvelopeController],
  providers: [EnvelopeService],
})
export class EnvelopeModule {}
