import { createContext, useContext } from 'react';
import type {
  MessageWithAuthor,
  PresenceEvent,
  RoomWithMeta,
  TypingEntry,
} from '@shared/index';
import type { ConnectionState } from '../services/socket';

/**
 * RoomContext — the currently active room + all live state.
 *
 * The provider owns:
 *   - the active room record (or null)
 *   - the message list
 *   - the participant list (presence)
 *   - the typing indicator list
 *   - the socket connection state
 *
 * All mutations go through actions (createRoom, joinRoom, leaveRoom,
 * sendMessage, markRead). The provider is the single source of truth —
 * child components never touch the socket directly.
 */
export interface RoomContextValue {
  room: RoomWithMeta | null;
  messages: MessageWithAuthor[];
  participants: PresenceEvent[];
  typing: TypingEntry[];
  unreadCount: number;
  connection: ConnectionState;
  loading: boolean;
  error?: string;

  createRoom: (input: {
    name?: string;
    page: { url: string; title: string; hostname: string; ogImageUrl?: string | null };
  }) => Promise<RoomWithMeta>;
  joinRoom: (code: string) => Promise<RoomWithMeta>;
  leaveRoom: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setTyping: (typing: boolean) => void;
  markRead: (messageIds: string[]) => void;
  /** Reset to "no active room" state. */
  reset: () => void;
}

export const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used inside <RoomProvider>');
  return ctx;
}
