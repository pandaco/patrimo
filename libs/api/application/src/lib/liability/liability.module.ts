import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { LiabilityController } from './liability.controller';
import { LiabilityService } from './liability.service';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [LiabilityController],
  providers: [LiabilityService],
})
export class LiabilityModule {}
