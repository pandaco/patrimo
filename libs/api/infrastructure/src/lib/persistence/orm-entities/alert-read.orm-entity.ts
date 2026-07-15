import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { UserOrmEntity } from './user.orm-entity';

@Entity({ name: 'alert_read' })
@Unique(['userId', 'alertHash'])
export class AlertReadOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'alert_hash', type: 'varchar', length: 128 })
  alertHash!: string;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt!: Date | null;
}
