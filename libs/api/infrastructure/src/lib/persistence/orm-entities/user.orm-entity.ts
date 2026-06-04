import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('users_google_id_uq', { unique: true })
  @Column({ name: 'google_id', type: 'varchar', length: 64 })
  googleId!: string;

  @Index('users_email_uq', { unique: true })
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, default: '' })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, default: '' })
  lastName!: string;

  @Column({ type: 'varchar', length: 8, default: '' })
  initials!: string;

  @Column({ type: 'text', nullable: true })
  picture!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
