import { Inject, Injectable } from '@nestjs/common';
import type { Transaction, TransactionRepository, TransactionSeed, TxType } from 'api-domain';
import { CreateTransactionDto, TransactionDto, TxTypeDto, UpdateTransactionDto } from 'contracts';
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

function toPatch(input: UpdateTransactionDto): Partial<TransactionSeed> {
  const patch: Partial<TransactionSeed> = {};
  if (input.envelopeId !== undefined) patch.envelopeId = input.envelopeId;
  if (input.etfIsin    !== undefined) patch.etfIsin    = input.etfIsin;
  if (input.type       !== undefined) patch.type       = input.type as TxType;
  if (input.date       !== undefined) patch.date       = new Date(input.date);
  if (input.quantity   !== undefined) patch.quantity   = input.quantity;
  if (input.price      !== undefined) patch.price      = input.price;
  if (input.fees       !== undefined) patch.fees       = input.fees;
  if (input.amount     !== undefined) patch.amount     = input.amount;
  return patch;
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

  async update(id: string, userId: string, input: UpdateTransactionDto): Promise<TransactionDto | null> {
    const updated = await this.transactions.updateForUser(id, userId, toPatch(input));
    return updated ? toDto(updated) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return this.transactions.deleteForUser(id, userId);
  }
}
