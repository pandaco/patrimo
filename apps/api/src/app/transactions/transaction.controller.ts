import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { TransactionDto } from 'contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { CreateTransactionDtoBody } from './dto/create-transaction.dto';
import { TransactionService } from './transaction.service';

@Controller('transactions')
@UseGuards(SessionGuard)
export class TransactionController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<TransactionDto[]> {
    return this.transactions.listForUser(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @SessionUser() user: AuthUser,
    @Body() body: CreateTransactionDtoBody,
  ): Promise<TransactionDto> {
    return this.transactions.create(user.id, body);
  }
}
