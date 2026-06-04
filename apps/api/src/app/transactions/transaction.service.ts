import { Inject, Injectable } from '@nestjs/common';
import type { Transaction, TransactionRepository, TxType } from 'api-domain';
import { CreateTransactionDto, TransactionDto, TxTypeDto } from 'contracts';
import { TRANSACTION_REPOSITORY } from 'infrastructure';

function toDto(tx: Transaction): TransactionDto {
  return {
    id: tx.id,
    envelopeId: tx.envelopeId,
    etfIsin: tx.etfIsin,
    type: tx.type as TxTypeDto,
    date: tx.date.toISOString().slice(0, 10),
    quantity: tx.quantity,
    price: tx.price,
    fees: tx.fees,
    amount: tx.amount,
  };
}

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly transactions: TransactionRepository,
  ) {}

  async listForUser(userId: string): Promise<TransactionDto[]> {
    const rows = await this.transactions.findByUserId(userId);
    return rows.map(toDto);
  }

  async create(userId: string, input: CreateTransactionDto): Promise<TransactionDto> {
    const created = await this.transactions.create({
      userId,
      envelopeId: input.envelopeId,
      etfIsin: input.etfIsin ?? null,
      type: input.type as TxType,
      date: new Date(input.date),
      quantity: input.quantity,
      price: input.price ?? null,
      fees: input.fees,
      amount: input.amount,
    });
    return toDto(created);
  }
}
