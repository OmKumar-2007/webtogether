import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { RoomEntity } from './room.entity';

/**
 * Message — a single chat message in a room.
 *
 * We store both `content` (raw text) and `html` (sanitized, emoji-replaced)
 * so we never re-sanitize on read.
 */
@Entity('messages')
@Index(['roomId', 'createdAt'])
@Index(['userId'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId!: string;

  @ManyToOne(() => RoomEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room?: RoomEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text' })
  html!: string;

  @Column({ type: 'varchar', length: 16, default: 'sent' })
  status!: 'sent' | 'delivered' | 'read';

  @Column({ name: 'system_event', type: 'varchar', length: 32, nullable: true })
  systemEvent?: 'joined' | 'left' | 'cleared' | 'migrated' | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
