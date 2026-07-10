import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../decimal.transformer';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'liabilities' })
export class LiabilityOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 128 })
  label!: string;

  @Column({ type: 'varchar', length: 32 })
  kind!: string;

  @Column({ name: 'initial_amount', type: 'numeric', precision: 18, scale: 2, transformer: decimalTransformer })
  initialAmount!: number;

  @Column({ name: 'current_balance', type: 'numeric', precision: 18, scale: 2, transformer: decimalTransformer })
  currentBalance!: number;

  @Column({ name: 'rate_pct', type: 'numeric', precision: 5, scale: 2, transformer: decimalTransformer })
  ratePct!: number;

  @Column({ name: 'monthly_payment', type: 'numeric', precision: 18, scale: 2, transformer: decimalTransformer })
  monthlyPayment!: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
