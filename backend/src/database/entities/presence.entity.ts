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
 * PresenceEntity — append-only audit log of join/leave/heartbeat events.
 *
 * The live "who is online now" view comes from Redis; this table is for
 * historical analysis (e.g., "average session length per user").
 */
@Entity('presence_events')
@Index(['roomId', 'createdAt'])
@Index(['userId'])
export class PresenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId!: string;

  @ManyToOne(() => RoomEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room?: RoomEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 16 })
  event!: 'joined' | 'left' | 'heartbeat' | 'idle';

  @Column({ name: 'socket_id', type: 'varchar', length: 64, nullable: true })
  socketId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
