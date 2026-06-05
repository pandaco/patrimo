import { Inject, Injectable } from '@nestjs/common';
import type { EtfRepository, EnvelopeRepository, Transaction, TransactionRepository, TransactionSeed, TxType } from '@patrimo/api-domain';
import { CreateTransactionDto, TransactionDto, TxTypeDto, UpdateTransactionDto } from '@patrimo/contracts';
import { ETF_REPOSITORY, ENVELOPE_REPOSITORY, TRANSACTION_REPOSITORY } from '@patrimo/infrastructure';

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
    @Inject(ENVELOPE_REPOSITORY)    private readonly envelopes:    EnvelopeRepository,
    @Inject(ETF_REPOSITORY)         private readonly etfs:         EtfRepository,
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

  async importCsv(userId: string, csv: string): Promise<{ count: number }> {
    const lines = csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('date,'));
    const [userEnvelopes, allEtfs] = await Promise.all([
      this.envelopes.findByUserId(userId),
      this.etfs.findAll(),
    ]);

    const envMap = new Map(userEnvelopes.map(e => [e.code, e.id]));
    const etfMap = new Map(allEtfs.map(e => [e.ticker, e.isin]));

    let count = 0;
    for (const line of lines) {
      const [date, type, envCode, ticker, qty, price, fees, amount] = line.split(',');
      
      const envelopeId = envMap.get(envCode);
      if (!envelopeId) continue;

      const etfIsin = ticker ? etfMap.get(ticker) : null;

      await this.transactions.create({
        userId,
        envelopeId,
        etfIsin: etfIsin ?? null,
        type: type as TxType,
        date: new Date(date),
        quantity: parseFloat(qty) || 0,
        price: price ? parseFloat(price) : null,
        fees: parseFloat(fees) || 0,
        amount: parseFloat(amount) || 0,
      });
      count++;
    }

    return { count };
  }
}
