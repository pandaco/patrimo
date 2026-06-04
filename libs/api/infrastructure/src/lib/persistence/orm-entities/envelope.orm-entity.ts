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
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'envelopes' })
@Index('envelopes_user_code_uq', ['userId', 'code'], { unique: true })
export class EnvelopeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar', length: 32 })
  glyph!: string;

  @Column({ type: 'varchar', length: 64 })
  label!: string;

  @Column({ type: 'varchar', length: 128 })
  broker!: string;

  @Column({ type: 'numeric', precision: 18, scale: 6, transformer: decimalTransformer })
  value!: number;

  @Column({ type: 'numeric', precision: 18, scale: 6, transformer: decimalTransformer })
  invested!: number;

  @Column({ type: 'numeric', precision: 18, scale: 6, transformer: decimalTransformer })
  cash!: number;

  @Column({ name: 'opened_at', type: 'date' })
  openedAt!: Date;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  plafond!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
