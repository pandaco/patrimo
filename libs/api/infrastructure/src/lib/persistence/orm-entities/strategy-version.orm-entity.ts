import type { AllocationTargets } from '@patrimo/api-domain';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'strategy_versions' })
export class StrategyVersionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @Column({ type: 'varchar', length: 16 })
  label!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'jsonb' })
  targets!: AllocationTargets;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
