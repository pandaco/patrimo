import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../decimal.transformer';
import { EnvelopeOrmEntity } from './envelope.orm-entity';
import { EtfOrmEntity } from './etf.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'transactions' })
@Index('transactions_user_date_idx', ['userId', 'date'])
export class TransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'envelope_id', type: 'uuid' })
  envelopeId!: string;

  @ManyToOne(() => EnvelopeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'envelope_id' })
  envelope?: EnvelopeOrmEntity;

  @Column({ name: 'etf_isin', type: 'varchar', length: 12, nullable: true })
  etfIsin!: string | null;

  @ManyToOne(() => EtfOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'etf_isin' })
  etf?: EtfOrmEntity | null;

  // Domain narrows this to the TxType union; persistence keeps it loose so the
  // CLI tools (migrations, seed) do not need to resolve the api-domain alias
  // through ts-node. Validation happens at the DTO boundary.
  @Column({ type: 'varchar', length: 16 })
  type!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'numeric', precision: 18, scale: 6, transformer: decimalTransformer })
  quantity!: number;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  price!: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, transformer: decimalTransformer })
  fees!: number;

  @Column({ type: 'numeric', precision: 18, scale: 6, transformer: decimalTransformer })
  amount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
