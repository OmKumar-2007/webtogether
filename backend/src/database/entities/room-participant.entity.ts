import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { RoomEntity } from './room.entity';

/**
 * RoomParticipant — durable record of who has joined a room.
 *
 * Presence (live socket connection) is tracked separately in Redis and
 * the PresenceEntity audit table; this table is the source of truth for
 * "who is in this room" across reconnects.
 */
@Entity('room_participants')
@Unique('uniq_room_user', ['roomId', 'userId'])
@Index(['roomId'])
@Index(['userId'])
export class RoomParticipantEntity {
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

  @Column({ name: 'is_host', type: 'boolean', default: false })
  isHost!: boolean;

  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
