import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersistenceModule, AlertReadOrmEntity } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { AlertController } from './alert.controller';
import { AlertRuleService } from './alert-rule.service';
import { AlertService } from './alert.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertReadOrmEntity]),
    PersistenceModule, 
    AuthModule, 
    PortfolioModule
  ],
  controllers: [AlertController],
  providers: [AlertService, AlertRuleService],
  exports: [AlertService],
})
export class AlertModule {}
