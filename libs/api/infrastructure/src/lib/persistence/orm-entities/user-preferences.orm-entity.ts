import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../decimal.transformer';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'user_preferences' })
export class UserPreferencesOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'risk_profile', type: 'varchar', length: 64, default: 'Équilibré dynamique' })
  riskProfile!: string;

  @Column({ name: 'horizon_years', type: 'integer', default: 25 })
  horizonYears!: number;

  @Column({ name: 'monthly_target', type: 'numeric', precision: 18, scale: 6, default: 0, transformer: decimalTransformer })
  monthlyTarget!: number;

  @Column({ name: 'display_currency', type: 'varchar', length: 8, default: 'EUR' })
  displayCurrency!: string;

  @Column({ name: 'ui_mode', type: 'varchar', length: 8, default: 'simple' })
  uiMode!: 'simple' | 'expert';

  @Column({ name: 'onboarding_done', type: 'boolean', default: false })
  onboardingDone!: boolean;

  // ISIN of the catalog ETF used as the performance benchmark.
  @Column({ name: 'benchmark_isin', type: 'varchar', length: 12, default: 'FR0010261198' })
  benchmarkIsin!: string;

  // Reference Livret A rate (%/yr) the dashboard compares the portfolio against.
  @Column({ name: 'livret_rate_pct', type: 'numeric', precision: 5, scale: 2, default: 2.4, transformer: decimalTransformer })
  livretRatePct!: number;

  @Column({ name: 'allocation_targets', type: 'jsonb', nullable: true })
  allocationTargets!: unknown | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
