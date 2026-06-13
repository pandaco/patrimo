import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { StrategyController } from './strategy.controller';
import { StrategyVersionService } from './strategy-version.service';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [StrategyController],
  providers: [StrategyVersionService],
})
export class StrategyModule {}
