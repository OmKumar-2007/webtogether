import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PresenceEntity } from '../../database/entities';
import {
  PRESENCE_IDLE_THRESHOLD_MS,
  PRESENCE_OFFLINE_THRESHOLD_MS,
  PresenceEvent,
  PresenceStatus,
} from '@shared/index';
import type { RedisClientType } from 'redis';

const PRESENCE_KEY = (roomId: string) => `presence:${roomId}`;
const SOCKET_MAP_KEY = (socketId: string) => `socket:${socketId}`;

/**
 * PresenceService — manages live presence in Redis.
 *
 * Data model in Redis:
 *   - presence:<roomId>  -> hash field=userId value=JSON({userId, displayName, avatarColor, lastSeenAt, socketIds:[]})
 *   - socket:<socketId>  -> string "<roomId>:<userId>" (TTL = offline threshold)
 *
 * The hash is the source of truth for "who is online in this room".
 * The socket map lets us delete the right entry when a socket disconnects.
 */
@Injectable()
export class PresenceService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    @InjectRepository(PresenceEntity)
    private readonly events: Repository<PresenceEntity>,
  ) {}

  /** Record a join: upsert presence + audit log. */
  async onJoin(
    roomId: string,
    user: { id: string; displayName: string; avatarColor: string },
    socketId: string,
  ): Promise<PresenceEvent[]> {
    await this.events.save(
      this.events.create({ roomId, userId: user.id, event: 'joined', socketId }),
    );
    return this.upsert(roomId, user, socketId, 'online');
  }

  /** Record a heartbeat: refresh lastSeenAt + status. */
  async onHeartbeat(
    roomId: string,
    userId: string,
    socketId: string,
  ): Promise<void> {
    const key = PRESENCE_KEY(roomId);
    const raw = await this.redis.hGet(key, userId);
    if (!raw) return;
    const entry = JSON.parse(raw) as PresenceEntry;
    entry.lastSeenAt = Date.now();
    entry.status = 'online';
    if (!entry.socketIds.includes(socketId)) entry.socketIds.push(socketId);
    await this.redis.hSet(key, userId, JSON.stringify(entry));
    await this.redis.expire(SOCKET_MAP_KEY(socketId), Math.ceil(PRESENCE_OFFLINE_THRESHOLD_MS / 1000));
  }

  /** Record a disconnect: remove socket from user; if no sockets remain, mark offline. */
  async onDisconnect(socketId: string): Promise<{ roomId: string; userId: string; removed: boolean } | null> {
    const mapRaw = await this.redis.get(SOCKET_MAP_KEY(socketId));
    if (!mapRaw) return null;
    const [roomId, userId] = mapRaw.split(':');
    await this.redis.del(SOCKET_MAP_KEY(socketId));

    const key = PRESENCE_KEY(roomId);
    const raw = await this.redis.hGet(key, userId);
    if (!raw) return { roomId, userId, removed: true };

    const entry = JSON.parse(raw) as PresenceEntry;
    entry.socketIds = entry.socketIds.filter((s) => s !== socketId);
    if (entry.socketIds.length === 0) {
      entry.status = 'offline';
      entry.lastSeenAt = Date.now();
      await this.events.save(
        this.events.create({ roomId, userId, event: 'left', socketId }),
      );
      await this.redis.hSet(key, userId, JSON.stringify(entry));
      return { roomId, userId, removed: true };
    }
    await this.redis.hSet(key, userId, JSON.stringify(entry));
    return { roomId, userId, removed: false };
  }

  /** List all online/idle participants in a room. */
  async list(roomId: string): Promise<PresenceEvent[]> {
    const key = PRESENCE_KEY(roomId);
    const map = await this.redis.hGetAll(key);
    const now = Date.now();
    const out: PresenceEvent[] = [];
    for (const raw of Object.values(map)) {
      const entry = JSON.parse(raw) as PresenceEntry;
      const status = this.deriveStatus(entry.lastSeenAt, now, entry.status);
      if (status === 'offline' && entry.socketIds.length === 0) continue;
      out.push({
        userId: entry.userId,
        displayName: entry.displayName,
        avatarColor: entry.avatarColor,
        status,
        lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
      });
    }
    return out;
  }

  /** Mark all stale presences offline. Returns count of removed entries. */
  async cleanupStale(): Promise<number> {
    // Scan all presence:* keys
    let removed = 0;
    let cursor = 0;
    do {
      const reply = await this.redis.scan(cursor, {
        MATCH: 'presence:*',
        COUNT: 100,
      });
      cursor = reply.cursor;
      for (const key of reply.keys) {
        const map = await this.redis.hGetAll(key);
        const now = Date.now();
        for (const [userId, raw] of Object.entries(map)) {
          const entry = JSON.parse(raw) as PresenceEntry;
          if (
            entry.socketIds.length === 0 &&
            now - entry.lastSeenAt > PRESENCE_OFFLINE_THRESHOLD_MS
          ) {
            await this.redis.hDel(key, userId);
            removed++;
          }
        }
        if (Object.keys(map).length === 0) await this.redis.del(key);
      }
    } while (cursor !== 0);
    return removed;
  }

  private async upsert(
    roomId: string,
    user: { id: string; displayName: string; avatarColor: string },
    socketId: string,
    status: PresenceStatus,
  ): Promise<PresenceEvent[]> {
    const key = PRESENCE_KEY(roomId);
    const raw = await this.redis.hGet(key, user.id);
    const entry: PresenceEntry = raw
      ? (JSON.parse(raw) as PresenceEntry)
      : {
          userId: user.id,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          lastSeenAt: Date.now(),
          status,
          socketIds: [],
        };
    entry.displayName = user.displayName;
    entry.avatarColor = user.avatarColor;
    entry.lastSeenAt = Date.now();
    entry.status = status;
    if (!entry.socketIds.includes(socketId)) entry.socketIds.push(socketId);

    await this.redis.hSet(key, user.id, JSON.stringify(entry));
    await this.redis.set(
      SOCKET_MAP_KEY(socketId),
      `${roomId}:${user.id}`,
      {
        EX: Math.ceil(PRESENCE_OFFLINE_THRESHOLD_MS / 1000),
      },
    );

    return this.list(roomId);
  }

  private deriveStatus(
    lastSeenAt: number,
    now: number,
    current: PresenceStatus,
  ): PresenceStatus {
    if (current === 'offline' || this.isOffline(lastSeenAt, now)) return 'offline';
    if (this.isIdle(lastSeenAt, now)) return 'idle';
    return 'online';
  }

  private isIdle(lastSeenAt: number, now: number): boolean {
    return now - lastSeenAt > PRESENCE_IDLE_THRESHOLD_MS;
  }

  private isOffline(lastSeenAt: number, now: number): boolean {
    return now - lastSeenAt > PRESENCE_OFFLINE_THRESHOLD_MS;
  }
}

interface PresenceEntry {
  userId: string;
  displayName: string;
  avatarColor: string;
  lastSeenAt: number;
  status: PresenceStatus;
  socketIds: string[];
}
