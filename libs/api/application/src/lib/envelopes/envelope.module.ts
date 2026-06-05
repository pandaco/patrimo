import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { EnvelopeController } from './envelope.controller';
import { EnvelopeService } from './envelope.service';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [EnvelopeController],
  providers: [EnvelopeService],
})
export class EnvelopeModule {}
