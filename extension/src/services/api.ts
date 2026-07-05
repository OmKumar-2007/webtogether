import type {
  CreateRoomDto,
  JoinRoomDto,
  LeaveRoomDto,
  MessageWithAuthor,
  RoomWithMeta,
  PublicUser,
  UpsertUserDto,
} from '@shared/index';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, type LocalUser } from '../types/storage';

/**
 * Backend REST client. Reads the backend URL from VITE_BACKEND_URL (set in
 * vite.config.ts) or `import.meta.env`. Defaults to localhost:3000.
 *
 * All requests carry the JWT in the Authorization header if available;
 * guest endpoints accept either a JWT or a `x-webtogether-userid` header.
 */
const BACKEND_URL = (import.meta as unknown as { env: { VITE_BACKEND_URL: string } }).env
  .VITE_BACKEND_URL;

export class ApiClient {
  constructor(private readonly baseUrl: string = BACKEND_URL) {}

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await storage.get<string | null>(STORAGE_KEYS.TOKEN, null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  /** Upsert a local guest user. */
  async upsertUser(user: LocalUser): Promise<PublicUser> {
    const body: UpsertUserDto = {
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl ?? null,
    };
    const res = await fetch(`${this.baseUrl}/users/${encodeURIComponent(user.id)}`, {
      method: 'PUT',
      headers: await this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`upsertUser failed: ${res.status}`);
    return res.json();
  }

  /** Mint a JWT for the local user. */
  async mintGuestToken(userId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(`mintGuestToken failed: ${res.status}`);
    const data = (await res.json()) as { token: string };
    return data.token;
  }

  /** Create a room with the host's page metadata. */
  async createRoom(dto: CreateRoomDto): Promise<RoomWithMeta> {
    const res = await fetch(`${this.baseUrl}/rooms`, {
      method: 'POST',
      headers: await this.authHeaders(),
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`createRoom failed: ${res.status}`);
    return res.json();
  }

  /** Get a room by id or 8-char code. */
  async getRoom(idOrCode: string): Promise<RoomWithMeta> {
    const res = await fetch(`${this.baseUrl}/rooms/${encodeURIComponent(idOrCode)}`, {
      headers: await this.authHeaders(),
    });
    if (!res.ok) throw new Error(`getRoom failed: ${res.status}`);
    return res.json();
  }

  /** Join a room (idempotent). */
  async joinRoom(idOrCode: string, dto: JoinRoomDto): Promise<RoomWithMeta> {
    const res = await fetch(`${this.baseUrl}/rooms/${encodeURIComponent(idOrCode)}/join`, {
      method: 'POST',
      headers: await this.authHeaders(),
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`joinRoom failed: ${res.status}`);
    return res.json();
  }

  /** Leave a room. */
  async leaveRoom(idOrCode: string, dto: LeaveRoomDto): Promise<{ archived: boolean }> {
    const res = await fetch(`${this.baseUrl}/rooms/${encodeURIComponent(idOrCode)}/leave`, {
      method: 'POST',
      headers: await this.authHeaders(),
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(`leaveRoom failed: ${res.status}`);
    return res.json();
  }

  /** List messages for a room. */
  async listMessages(idOrCode: string, limit = 100, before?: Date): Promise<MessageWithAuthor[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before.toISOString());
    const res = await fetch(
      `${this.baseUrl}/rooms/${encodeURIComponent(idOrCode)}/messages?${params}`,
      { headers: await this.authHeaders() },
    );
    if (!res.ok) throw new Error(`listMessages failed: ${res.status}`);
    return res.json();
  }
}

/** Shared singleton. */
export const api = new ApiClient();
