import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../decimal.transformer';

@Entity({ name: 'etfs' })
export class EtfOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 12 })
  isin!: string;

  @Index('etfs_ticker_uq', { unique: true })
  @Column({ type: 'varchar', length: 20 })
  ticker!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 64 })
  issuer!: string;

  @Column({ type: 'varchar', length: 64 })
  index!: string;

  @Column({ type: 'numeric', precision: 8, scale: 4, transformer: decimalTransformer })
  ter!: number;

  @Column({ type: 'varchar', length: 8 })
  currency!: string;

  @Column({ type: 'varchar', length: 32 })
  repli!: string;

  @Column({ type: 'varchar', length: 32 })
  distrib!: string;

  @Column({ type: 'boolean' })
  pea!: boolean;

  @Column({ type: 'varchar', length: 32 })
  alloc!: 'Core' | 'Satellite' | 'Obligations' | 'Matières premières';

  // Followed without a position — excluded from portfolio analytics.
  @Column({ name: 'watch_only', type: 'boolean', default: false })
  watchOnly!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  exposure?: {
    geography: Record<string, number>;
    sector: Record<string, number>;
    currency: Record<string, number>;
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
