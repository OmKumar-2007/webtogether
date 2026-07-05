/** Live presence state, primarily stored in Redis. */
export type PresenceStatus = 'online' | 'idle' | 'offline';

export interface Presence {
  userId: string;
  roomId: string;
  status: PresenceStatus;
  /** Socket id of the live connection (one user may have multiple). */
  socketId: string;
  lastSeenAt: string;
}

/** Compact presence payload broadcast on the wire. */
export interface PresenceEvent {
  userId: string;
  displayName: string;
  avatarColor: string;
  status: PresenceStatus;
  lastSeenAt: string;
}

export interface ParticipantListDto {
  roomId: string;
  participants: PresenceEvent[];
}

/** Per-user typing indicator entry, broadcast to the room. */
export interface TypingEntry {
  userId: string;
  displayName: string;
  avatarColor: string;
  startedAt: number;
}

/** Wire payload for the `typing` server→client event. */
export interface TypingEvent {
  roomId: string;
  entries: TypingEntry[];
}
