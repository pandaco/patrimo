import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
