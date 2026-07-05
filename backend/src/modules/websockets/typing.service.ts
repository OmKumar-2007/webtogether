import { Inject, Injectable } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import {
  PRESENCE_HEARTBEAT_MS,
  TYPING_DEBOUNCE_MS,
  TYPING_TTL_SECONDS,
} from '@shared/index';

const TYPING_KEY = (roomId: string) => `typing:${roomId}`;

interface TypingEntry {
  userId: string;
  displayName: string;
  avatarColor: string;
  startedAt: number;
}

/**
 * TypingService — tracks per-room typing indicators in Redis.
 *
 * Strategy:
 *   - On `typing:start`, upsert the user into the room's typing set with a TTL.
 *   - On `typing:stop`, remove them immediately.
 *   - The gateway broadcasts the current set to the room every TYPING_DEBOUNCE_MS.
 *
 * Each call refreshes the TTL so a user who keeps typing stays in the set.
 */
@Injectable()
export class TypingService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClientType) {}

  async start(
    roomId: string,
    user: { id: string; displayName: string; avatarColor: string },
  ): Promise<TypingEntry[]> {
    const key = TYPING_KEY(roomId);
    const entry: TypingEntry = {
      userId: user.id,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      startedAt: Date.now(),
    };
    await this.redis.hSet(key, user.id, JSON.stringify(entry));
    await this.redis.expire(key, TYPING_TTL_SECONDS);
    return this.list(roomId);
  }

  async stop(roomId: string, userId: string): Promise<TypingEntry[]> {
    const key = TYPING_KEY(roomId);
    await this.redis.hDel(key, userId);
    return this.list(roomId);
  }

  async list(roomId: string): Promise<TypingEntry[]> {
    const key = TYPING_KEY(roomId);
    const map = await this.redis.hGetAll(key);
    const now = Date.now();
    const entries: TypingEntry[] = [];
    for (const raw of Object.values(map)) {
      const entry = JSON.parse(raw) as TypingEntry;
      // Drop entries older than the debounce window — client forgot to stop.
      if (now - entry.startedAt > TYPING_DEBOUNCE_MS * 2) continue;
      entries.push(entry);
    }
    return entries;
  }

  /** Recommended broadcast interval; gateway uses this to throttle. */
  get broadcastIntervalMs(): number {
    return Math.min(PRESENCE_HEARTBEAT_MS / 3, TYPING_DEBOUNCE_MS);
  }
}
