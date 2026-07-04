import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../decimal.transformer';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'wealth_snapshot' })
@Index('wealth_snapshot_user_date_uq', ['userId', 'date'], { unique: true })
export class WealthSnapshotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  /** Stored as a plain date; pg returns it as a YYYY-MM-DD string. */
  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: decimalTransformer })
  total!: number;

  @Column({ name: 'by_category', type: 'jsonb' })
  byCategory!: Record<string, number>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
