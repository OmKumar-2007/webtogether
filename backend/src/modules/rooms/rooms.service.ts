import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RoomEntity,
  RoomParticipantEntity,
  UserEntity,
  MessageEntity,
} from '../../database/entities';
import { UsersService } from '../users/users.service';
import {
  AVATAR_COLORS,
  generateRoomCode,
  MAX_PARTICIPANTS_PER_ROOM,
  randomAvatarColor,
  RoomWithMeta,
  sanitizeMessageHtml,
} from '@shared/index';
import { CreateRoomDto, JoinRoomDto } from './dto/create-room.dto';

/**
 * RoomsService — owns all CRUD operations on rooms and participants.
 *
 * Key responsibilities:
 *   - Create a room with a unique code (retry on collision).
 *   - Join a room (idempotent upsert of participant).
 *   - Leave a room (mark participant left_at, emit system message).
 *   - Fetch room with participant count + host info.
 */
@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly rooms: Repository<RoomEntity>,
    @InjectRepository(RoomParticipantEntity)
    private readonly participants: Repository<RoomParticipantEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    private readonly users: UsersService,
  ) {}

  /** Create a new room, upserting the host as a guest user if needed. */
  async create(dto: CreateRoomDto): Promise<RoomWithMeta> {
    // Upsert host
    const host = await this.users.upsertGuest({
      id: dto.hostUser.id,
      displayName: dto.hostUser.displayName,
      avatarColor: dto.hostUser.avatarColor ?? randomAvatarColor(AVATAR_COLORS),
      avatarUrl: dto.hostUser.avatarUrl ?? null,
    });

    // Generate unique room code (retry up to 5 times on collision)
    let code = '';
    for (let i = 0; i < 5; i++) {
      const candidate = generateRoomCode();
      const exists = await this.rooms.findOne({ where: { code: candidate } });
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new ConflictException('Failed to allocate a unique room code');

    // Persist room
    const room = await this.rooms.save(
      this.rooms.create({
        code,
        name: dto.name?.trim() || `Room ${code}`,
        description: dto.description ?? null,
        page: dto.page,
        visibility: dto.visibility ?? 'private',
        hostId: host.id,
        maxParticipants: dto.maxParticipants ?? MAX_PARTICIPANTS_PER_ROOM,
      }),
    );

    // Add host as participant
    await this.participants.save(
      this.participants.create({
        roomId: room.id,
        userId: host.id,
        isHost: true,
      }),
    );

    // System "joined" message
    await this.messages.save(
      this.messages.create({
        roomId: room.id,
        userId: host.id,
        content: `${host.displayName} created this room`,
        html: sanitizeMessageHtml(`${host.displayName} created this room`),
        status: 'sent',
        systemEvent: 'joined',
      }),
    );

    return this.toRoomWithMeta(room, host);
  }

  /** Get a room by code (preferred by clients) or by id. */
  async get(idOrCode: string): Promise<RoomWithMeta> {
    const room = await this.rooms.findOne({
      where: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }],
    });
    if (!room) throw new NotFoundException(`Room ${idOrCode} not found`);
    if (room.archivedAt) throw new NotFoundException(`Room ${idOrCode} has been archived`);

    const host = await this.users.get(room.hostId);
    return this.toRoomWithMeta(room, host);
  }

  /** Join a room (idempotent upsert). Returns the room + participant info. */
  async join(idOrCode: string, dto: JoinRoomDto): Promise<RoomWithMeta> {
    const room = await this.rooms.findOne({
      where: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }],
    });
    if (!room) throw new NotFoundException(`Room ${idOrCode} not found`);
    if (room.archivedAt) throw new NotFoundException(`Room ${idOrCode} has been archived`);

    const user = await this.users.upsertGuest({
      id: dto.user.id,
      displayName: dto.user.displayName,
      avatarColor: dto.user.avatarColor,
      avatarUrl: dto.user.avatarUrl,
    });

    const count = await this.participants.count({
      where: { roomId: room.id, leftAt: undefined as never },
    });
    if (count >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    // Idempotent: if already a participant (not left), just re-activate.
    const existing = await this.participants.findOne({
      where: { roomId: room.id, userId: user.id },
    });
    if (existing) {
      if (existing.leftAt) {
        existing.leftAt = null;
        await this.participants.save(existing);
        await this.messages.save(
          this.messages.create({
            roomId: room.id,
            userId: user.id,
            content: `${user.displayName} rejoined`,
            html: sanitizeMessageHtml(`${user.displayName} rejoined`),
            status: 'sent',
            systemEvent: 'joined',
          }),
        );
      }
    } else {
      await this.participants.save(
        this.participants.create({
          roomId: room.id,
          userId: user.id,
          isHost: false,
        }),
      );
      await this.messages.save(
        this.messages.create({
          roomId: room.id,
          userId: user.id,
          content: `${user.displayName} joined`,
          html: sanitizeMessageHtml(`${user.displayName} joined`),
          status: 'sent',
          systemEvent: 'joined',
        }),
      );
    }

    return this.toRoomWithMeta(room, user);
  }

  /** Leave a room. The host leaving archives the room. */
  async leave(idOrCode: string, userId: string): Promise<{ archived: boolean }> {
    const room = await this.rooms.findOne({
      where: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }],
    });
    if (!room) throw new NotFoundException(`Room ${idOrCode} not found`);

    const participant = await this.participants.findOne({
      where: { roomId: room.id, userId },
    });
    if (!participant) throw new BadRequestException('You are not in this room');

    participant.leftAt = new Date();
    await this.participants.save(participant);

    const user = await this.users.get(userId);
    await this.messages.save(
      this.messages.create({
        roomId: room.id,
        userId,
        content: `${user.displayName} left`,
        html: sanitizeMessageHtml(`${user.displayName} left`),
        status: 'sent',
        systemEvent: 'left',
      }),
    );

    // If host leaves, archive the room.
    if (room.hostId === userId) {
      room.archivedAt = new Date();
      await this.rooms.save(room);
      return { archived: true };
    }

    return { archived: false };
  }

  /** Count currently-active participants for a room. */
  async countParticipants(roomId: string): Promise<number> {
    return this.participants.count({
      where: { roomId, leftAt: undefined as never },
    });
  }

  /** List all participants who have not left, with their user records. */
  async listParticipants(roomId: string): Promise<UserEntity[]> {
    const rows = await this.participants.find({
      where: { roomId, leftAt: undefined as never },
      relations: ['user'],
    });
    // Non-lazy relation — `r.user` is a direct UserEntity reference.
    return rows
      .map((r) => r.user)
      .filter((u): u is UserEntity => u !== undefined);
  }

  private async toRoomWithMeta(room: RoomEntity, host: UserEntity): Promise<RoomWithMeta> {
    const participantCount = await this.countParticipants(room.id);
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      description: room.description ?? undefined,
      page: room.page,
      visibility: room.visibility,
      hostId: room.hostId,
      maxParticipants: room.maxParticipants,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      archivedAt: room.archivedAt?.toISOString() ?? undefined,
      host: {
        id: host.id,
        displayName: host.displayName,
        avatarColor: host.avatarColor,
        avatarUrl: host.avatarUrl ?? undefined,
        isGuest: host.isGuest,
      },
      participantCount,
      isLive: participantCount > 0,
    };
  }
}
