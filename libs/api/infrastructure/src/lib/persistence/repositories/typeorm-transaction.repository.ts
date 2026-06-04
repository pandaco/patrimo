import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Transaction, TransactionRepository, TransactionSeed, TxType } from 'api-domain';
import { Repository } from 'typeorm';
import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';

// pg returns `date` columns as `YYYY-MM-DD` strings; coerce to Date so the
// domain entity stays honest about its type signature.
function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDomain(row: TransactionOrmEntity): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    envelopeId: row.envelopeId,
    etfIsin: row.etfIsin,
    type: row.type as TxType,
    date: toDate(row.date),
    quantity: row.quantity,
    price: row.price,
    fees: row.fees,
    amount: row.amount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class TypeOrmTransactionRepository implements TransactionRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repo: Repository<TransactionOrmEntity>,
  ) {}

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    const rows = await this.repo.find({ where: { userId }, order: { date: 'DESC' } });
    return rows.map(toDomain);
  }

  async create(seed: TransactionSeed): Promise<Transaction> {
    const entity: TransactionOrmEntity = this.repo.create(seed as Partial<TransactionOrmEntity>);
    const saved: TransactionOrmEntity  = await this.repo.save(entity);
    return toDomain(saved);
  }

  async updateForUser(
    id: string,
    userId: string,
    patch: Partial<TransactionSeed>,
  ): Promise<Transaction | null> {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) return null;
    Object.assign(existing, patch as Partial<TransactionOrmEntity>);
    const saved: TransactionOrmEntity = await this.repo.save(existing);
    return toDomain(saved);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
