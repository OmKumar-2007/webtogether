import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * User entity.
 *
 * For the MVP we support both guest users (created on-the-fly when they
 * host/join a room) and full JWT-authenticated users. The `isGuest` flag
 * distinguishes them; guests have null `email` and `passwordHash`.
 */
@Entity('users')
@Index(['displayName'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  displayName!: string;

  @Column({ name: 'avatar_color', type: 'varchar', length: 16, default: '#3b82f6' })
  avatarColor!: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true })
  avatarUrl?: string | null;

  @Column({ name: 'is_guest', type: 'boolean', default: true })
  isGuest!: boolean;

  @Column({ type: 'varchar', length: 320, nullable: true, unique: true })
  email?: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
