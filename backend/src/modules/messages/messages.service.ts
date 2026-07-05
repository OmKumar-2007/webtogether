import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity, RoomEntity, UserEntity } from '../../database/entities';
import {
  MAX_MESSAGE_LENGTH,
  MessageWithAuthor,
  replaceEmojiShortnames,
  sanitizeMessageHtml,
} from '@shared/index';

/**
 * MessagesService — handles persistence of chat messages.
 *
 * WebSocket sends/receives also go through here so we have a single
 * sanitization + persistence path for both REST and WS.
 */
@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    @InjectRepository(RoomEntity)
    private readonly rooms: Repository<RoomEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  /** Paginated fetch of messages, oldest-first, capped at 200. */
  async list(roomId: string, limit = 100, before?: Date): Promise<MessageWithAuthor[]> {
    const qb = this.messages
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'user')
      .where('m.room_id = :roomId', { roomId })
      .orderBy('m.created_at', 'DESC')
      .take(Math.min(limit, 200));

    if (before) qb.andWhere('m.created_at < :before', { before: before.toISOString() });

    const rows = await qb.getMany();
    return rows.reverse().map((m) => this.toWithAuthor(m, m.user ?? null));
  }

  /** Persist a chat message. Returns the saved record with author info. */
  async send(
    roomId: string,
    userId: string,
    content: string,
    systemEvent?: 'joined' | 'left' | 'cleared' | 'migrated',
  ): Promise<MessageWithAuthor> {
    const room = await this.rooms.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
    if (room.archivedAt) throw new NotFoundException('Room has been archived');

    const trimmed = content.trim();
    if (!trimmed) throw new Error('Empty message');
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds ${MAX_MESSAGE_LENGTH} chars`);
    }

    const withEmoji = replaceEmojiShortnames(trimmed);
    const html = sanitizeMessageHtml(withEmoji);

    const saved = await this.messages.save(
      this.messages.create({
        roomId,
        userId,
        content: trimmed,
        html,
        status: 'sent',
        systemEvent: systemEvent ?? null,
      }),
    );

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return this.toWithAuthor({ ...saved, user });
  }

  /** Mark messages as read by a user. */
  async markRead(roomId: string, _userId: string, messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    await this.messages
      .createQueryBuilder()
      .update()
      .set({ status: 'read' })
      .where('room_id = :roomId AND id IN (:...ids)', { roomId, ids: messageIds })
      .execute();
  }

  private toWithAuthor(m: MessageEntity, user?: UserEntity | null): MessageWithAuthor {
    const author = user
      ? {
          id: user.id,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
        }
      : {
          id: 'system',
          displayName: 'System',
          avatarColor: '#64748b',
        };
    return {
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      content: m.content,
      html: m.html,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      systemEvent: m.systemEvent ?? null,
      author,
    };
  }
}
