/**
 * Canonical socket event names shared between client and server.
 * Keep this as the single source of truth — never hard-code event strings.
 */
export const ServerToClientEvents = {
  Message: 'message',
  MessageAck: 'message:ack',
  MessageUpdated: 'message:updated',
  Typing: 'typing',
  Presence: 'presence',
  Participants: 'participants',
  RoomUpdated: 'room:updated',
  Joined: 'room:joined',
  Left: 'room:left',
  Error: 'error',
  Reconnect: 'reconnect',
} as const;

export const ClientToServerEvents = {
  Join: 'room:join',
  Leave: 'room:leave',
  SendMessage: 'message:send',
  Typing: 'typing:start',
  StopTyping: 'typing:stop',
  MarkRead: 'message:read',
  Heartbeat: 'heartbeat',
} as const;

export type ServerToClientEvent = typeof ServerToClientEvents[keyof typeof ServerToClientEvents];
export type ClientToServerEvent = typeof ClientToServerEvents[keyof typeof ClientToServerEvents];

// Re-export shared types used by event payloads
import type { MessageWithAuthor, RoomWithMeta } from '../types';
import type { PresenceEvent, TypingEvent, ParticipantListDto } from '../types';

/**
 * Socket.IO event-map interfaces — these are TYPE maps used by both
 * the server (Server<ClientToServerEventMap, ServerToClientEventMap>)
 * and the client (Socket<ServerToClientEventMap, ClientToServerEventMap>).
 *
 * They mirror the canonical event-name constants above.
 */
export interface ClientToServerEventMap {
  'room:join': (payload: { roomCode: string }) => void;
  'room:leave': (payload: { roomCode: string }) => void;
  'message:send': (
    payload: { roomCode: string; content: string; clientMessageId?: string },
  ) => void;
  'typing:start': (payload: { roomCode: string }) => void;
  'typing:stop': (payload: { roomCode: string }) => void;
  'message:read': (payload: { roomCode: string; messageIds: string[] }) => void;
  heartbeat: (payload: { roomCode: string }) => void;
}

export interface ServerToClientEventMap {
  message: (message: MessageWithAuthor) => void;
  'message:ack': (ack: { clientMessageId?: string; message: MessageWithAuthor }) => void;
  'message:updated': (message: MessageWithAuthor) => void;
  typing: (payload: TypingEvent) => void;
  presence: (event: PresenceEvent) => void;
  participants: (payload: ParticipantListDto) => void;
  'room:updated': (room: RoomWithMeta) => void;
  'room:joined': (payload: { room: RoomWithMeta; recentMessages: MessageWithAuthor[] }) => void;
  'room:left': (payload: { roomId: string }) => void;
  error: (payload: { message: string }) => void;
  reconnect: () => void;
}
