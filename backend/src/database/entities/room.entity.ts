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
import { UserEntity } from './user.entity';

/**
 * Room — the central object of WebTogether.
 *
 * A room is created on a specific URL with page metadata. Multiple users
 * can join as participants (see RoomParticipantEntity). The host is a
 * User; if the host leaves, the room can be transferred or archived.
 */
@Entity('rooms')
@Index(['code'], { unique: true })
@Index(['hostId'])
@Index(['visibility'])
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short human-friendly invite code (e.g. `ABCD1234`). */
  @Column({ type: 'varchar', length: 8, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description?: string | null;

  /** Snapshot of the host's page metadata at creation time. */
  @Column({ type: 'jsonb' })
  page!: {
    url: string;
    title: string;
    hostname: string;
    ogImageUrl?: string | null;
  };

  @Column({ type: 'varchar', length: 16, default: 'private' })
  visibility!: 'public' | 'private';

  @Column({ name: 'host_id', type: 'uuid' })
  hostId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_id' })
  host?: UserEntity;

  @Column({ name: 'max_participants', type: 'int', default: 50 })
  maxParticipants!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt?: Date | null;
}
