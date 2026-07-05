import { PublicUser } from './user';

/** Metadata about the page the host was viewing when they created the room. */
export interface RoomPageMetadata {
  url: string;
  title: string;
  hostname: string;
  /** Optional OpenGraph image, if detectable. */
  ogImageUrl?: string | null;
}

export type RoomVisibility = 'public' | 'private';

/** Room record as stored in PostgreSQL. */
export interface Room {
  id: string;
  /** Short human-friendly code used in invite links, e.g. `ABCD1234`. */
  code: string;
  name: string;
  description?: string | null;
  page: RoomPageMetadata;
  visibility: RoomVisibility;
  /** User id of the host. */
  hostId: string;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
  /** Soft-delete flag; we keep rooms for history but hide them from listings. */
  archivedAt?: string | null;
}

/** Room shape that is safe to broadcast — host + participant count attached. */
export interface RoomWithMeta extends Room {
  host: PublicUser;
  participantCount: number;
  isLive: boolean;
}

export interface CreateRoomDto {
  name?: string;
  description?: string;
  page: RoomPageMetadata;
  visibility?: RoomVisibility;
  maxParticipants?: number;
  hostUser: UpsertUserPayload;
}

/** Inline upsert because guest users are created on-the-fly when hosting. */
export interface UpsertUserPayload {
  id: string;
  displayName: string;
  avatarColor?: string;
  avatarUrl?: string | null;
  isGuest?: boolean;
}

export interface JoinRoomDto {
  user: UpsertUserPayload;
}

export interface LeaveRoomDto {
  userId: string;
}
