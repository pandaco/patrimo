import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AlertType } from '@patrimo/contracts';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'alert_rules' })
export class AlertRuleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @Column({ type: 'varchar', length: 64 })
  type!: AlertType;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  threshold!: number;

  @Column({ type: 'jsonb' })
  channels!: string[];

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
