import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EnvelopeOrmEntity } from './envelope.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'dca_plans' })
export class DcaPlanOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @Column({ name: 'envelope_id' })
  envelopeId!: string;

  @ManyToOne(() => EnvelopeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'envelope_id' })
  envelope!: EnvelopeOrmEntity;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  amount!: number;

  @Column({ type: 'varchar', length: 16 })
  frequency!: 'MONTHLY';

  @Column({ name: 'day_of_month', type: 'int' })
  dayOfMonth!: number;

  @Column({ type: 'jsonb' })
  allocations!: Record<string, number>;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: 'next_execution', type: 'date' })
  nextExecution!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
