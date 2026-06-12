import { Transaction, TransactionSeed } from '../entities/transaction.entity';

export const TRANSACTION_REPOSITORY = 'TRANSACTION_REPOSITORY';

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByUserId(userId: string): Promise<Transaction[]>;
  create(seed: TransactionSeed): Promise<Transaction>;
  /**
   * Apply `patch` to the transaction iff it belongs to `userId`.
   * Returns `null` when the row does not exist or is owned by someone else,
   * giving the caller a clean 404 path without a separate ownership query.
   */
  updateForUser(
    id: string,
    userId: string,
    patch: Partial<TransactionSeed>,
  ): Promise<Transaction | null>;
  /** Delete the transaction iff it belongs to `userId`. Returns `true` when a row was removed. */
  deleteForUser(id: string, userId: string): Promise<boolean>;
  deleteByTransferId(transferId: string, userId: string): Promise<number>;
}
