import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RoomContext, type RoomContextValue } from './room-context';
import { useUser } from './user-context';
import { api } from '../services/api';
import {
  connectSocket,
  connection,
  disconnectSocket,
  getSocket,
  type ConnectionState,
} from '../services/socket';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../types/storage';
import type {
  MessageWithAuthor,
  PresenceEvent,
  RoomWithMeta,
  TypingEntry,
} from '@shared/index';
import {
  ClientToServerEventMap,
  ServerToClientEventMap,
  TYPING_DEBOUNCE_MS,
} from '@shared/index';
import type { Socket } from 'socket.io-client';

interface TypingPayload {
  roomId: string;
  entries: TypingEntry[];
}

/**
 * RoomProvider — orchestrates the WebSocket connection and live room state.
 *
 * Implementation notes:
 *   - We attach socket listeners ONCE per room join (in `joinRoom`), and
 *     tear them down on `leaveRoom`. This avoids double-listening on
 *     reconnect.
 *   - The local user's "self" message is added optimistically on send
 *     and replaced when the server ack arrives with `clientMessageId`.
 *   - Unread count is incremented when a message arrives and the overlay
 *     is collapsed; reset to 0 when the user opens the overlay.
 */
export function RoomProvider({ children }: { children: ReactNode }) {
  const { user, token } = useUser();

  const [room, setRoom] = useState<RoomWithMeta | null>(null);
  const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
  const [participants, setParticipants] = useState<PresenceEvent[]>([]);
  const [typing, setTypingState] = useState<TypingEntry[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [conn, setConn] = useState<ConnectionState>(connection.get());

  const lastTypingSent = useRef(0);
  const isOverlayOpen = useRef(false);
  const socketRef = useRef<Socket<ServerToClientEventMap, ClientToServerEventMap> | null>(null);

  // Subscribe to connection state
  useEffect(() => {
    return connection.subscribe(setConn);
  }, []);

  /** Attach all socket listeners for the current room. */
  const attachListeners = useCallback(
    (sock: Socket<ServerToClientEventMap, ClientToServerEventMap>, roomId: string) => {
      sock.on('message', (msg: MessageWithAuthor) => {
        if (msg.roomId !== roomId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (!isOverlayOpen.current && msg.userId !== user?.id) {
          setUnread((n) => n + 1);
        }
      });
      sock.on('message:ack', (ack) => {
        if (!ack.clientMessageId) return;
        setMessages((prev) =>
          prev.map((m) =>
            (m as MessageWithAuthor & { clientMessageId?: string }).clientMessageId ===
            ack.clientMessageId
              ? ack.message
              : m,
          ),
        );
      });
      sock.on('participants', (p: { roomId: string; participants: PresenceEvent[] }) => {
        if (p.roomId !== roomId) return;
        setParticipants(p.participants);
      });
      sock.on('presence', () => {
        // Already covered by 'participants' broadcast
      });
      sock.on('typing', (t: TypingPayload) => {
        if (t.roomId !== roomId) return;
        setTypingState(t.entries.filter((e) => e.userId !== user?.id));
      });
      sock.on('error', (e: { message?: string }) => {
        setError(e?.message ?? 'Unknown socket error');
      });
      sock.on('room:left', () => {
        setRoom(null);
        setMessages([]);
        setParticipants([]);
        setTypingState([]);
      });
    },
    [user?.id],
  );

  /** Detach all per-room listeners. */
  const detachListeners = useCallback(
    (sock: Socket<ServerToClientEventMap, ClientToServerEventMap>) => {
      sock.removeAllListeners('message');
      sock.removeAllListeners('message:ack');
      sock.removeAllListeners('participants');
      sock.removeAllListeners('presence');
      sock.removeAllListeners('typing');
      sock.removeAllListeners('error');
      sock.removeAllListeners('room:left');
    },
    [],
  );

  /** Create a room with the host's page metadata. */
  const createRoom = useCallback<RoomContextValue['createRoom']>(
    async (input) => {
      if (!user) throw new Error('Not authenticated');
      setLoading(true);
      setError(undefined);
      try {
        const created = await api.createRoom({
          name: input.name,
          page: input.page,
          hostUser: {
            id: user.id,
            displayName: user.displayName,
            avatarColor: user.avatarColor,
            avatarUrl: user.avatarUrl ?? null,
            isGuest: user.isGuest,
          },
        });
        await storage.set(STORAGE_KEYS.ACTIVE_ROOM, { code: created.code, id: created.id });
        await storage.set(STORAGE_KEYS.SETTINGS + '__lastRoomCode', created.code);

        // Connect socket if not already, then join the room
        const sock = await connectSocket();
        socketRef.current = sock;
        attachListeners(sock, created.id);
        sock.emit('room:join', { roomCode: created.code });
        setRoom(created);
        setMessages([]);
        setUnread(0);
        return created;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, attachListeners],
  );

  /** Join an existing room by code. */
  const joinRoom = useCallback<RoomContextValue['joinRoom']>(
    async (code) => {
      if (!user) throw new Error('Not authenticated');
      setLoading(true);
      setError(undefined);
      try {
        const joined = await api.joinRoom(code, {
          user: {
            id: user.id,
            displayName: user.displayName,
            avatarColor: user.avatarColor,
            avatarUrl: user.avatarUrl ?? null,
            isGuest: user.isGuest,
          },
        });
        await storage.set(STORAGE_KEYS.ACTIVE_ROOM, { code: joined.code, id: joined.id });

        const sock = await connectSocket();
        socketRef.current = sock;
        attachListeners(sock, joined.id);
        sock.emit('room:join', { roomCode: joined.code });
        setRoom(joined);
        setUnread(0);
        return joined;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, attachListeners],
  );

  /** Leave the current room. */
  const leaveRoom = useCallback(async () => {
    const sock = getSocket();
    if (room && sock) {
      sock.emit('room:leave', { roomCode: room.code });
      detachListeners(sock);
    }
    await storage.remove(STORAGE_KEYS.ACTIVE_ROOM);
    setRoom(null);
    setMessages([]);
    setParticipants([]);
    setTypingState([]);
    setUnread(0);
  }, [room, detachListeners]);

  /** Send a message. Optimistic insert + ack replacement. */
  const sendMessage = useCallback<RoomContextValue['sendMessage']>(
    async (content) => {
      const sock = getSocket();
      if (!room || !sock || !user) throw new Error('Not in a room');
      const trimmed = content.trim();
      if (!trimmed) return;

      const clientMessageId = crypto.randomUUID();
      const optimistic: MessageWithAuthor & { clientMessageId?: string } = {
        id: clientMessageId,
        roomId: room.id,
        userId: user.id,
        content: trimmed,
        html: trimmed.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        status: 'sent',
        createdAt: new Date().toISOString(),
        systemEvent: null,
        author: {
          id: user.id,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
        },
        clientMessageId,
      };
      setMessages((prev) => [...prev, optimistic]);

      sock.emit('message:send', {
        roomCode: room.code,
        content: trimmed,
        clientMessageId,
      });

      // Stop typing after send
      sock.emit('typing:stop', { roomCode: room.code });
      setTypingState([]);
    },
    [room, user],
  );

  /** Send typing:start or typing:stop with client-side debounce. */
  const setTyping = useCallback<RoomContextValue['setTyping']>(
    (isTyping) => {
      const sock = getSocket();
      if (!room || !sock) return;
      const now = Date.now();
      if (isTyping) {
        if (now - lastTypingSent.current < TYPING_DEBOUNCE_MS) return;
        lastTypingSent.current = now;
        sock.emit('typing:start', { roomCode: room.code });
      } else {
        lastTypingSent.current = 0;
        sock.emit('typing:stop', { roomCode: room.code });
      }
    },
    [room],
  );

  /** Mark messages as read. */
  const markRead = useCallback<RoomContextValue['markRead']>(
    (messageIds) => {
      const sock = getSocket();
      if (!room || !sock || messageIds.length === 0) return;
      sock.emit('message:read', { roomCode: room.code, messageIds });
    },
    [room],
  );

  const reset = useCallback(() => {
    setRoom(null);
    setMessages([]);
    setParticipants([]);
    setTypingState([]);
    setUnread(0);
    setError(undefined);
  }, []);

  /** Disconnect socket when token vanishes (sign-out). */
  useEffect(() => {
    if (!token) disconnectSocket();
  }, [token]);

  /** Cleanup on unmount. */
  useEffect(() => {
    return () => {
      const sock = socketRef.current;
      if (sock) detachListeners(sock);
    };
  }, [detachListeners]);

  /** Restore the active room on mount (if any). */
  useEffect(() => {
    if (!token || !user) return;
    (async () => {
      const active = await storage.get<{ code: string; id: string } | null>(
        STORAGE_KEYS.ACTIVE_ROOM,
        null,
      );
      if (!active) return;
      try {
        // Re-join automatically
        await joinRoom(active.code);
      } catch (err) {
        console.warn('[RoomProvider] rejoin failed:', err);
        await storage.remove(STORAGE_KEYS.ACTIVE_ROOM);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const value = useMemo<RoomContextValue>(
    () => ({
      room,
      messages,
      participants,
      typing,
      unreadCount: unread,
      connection: conn,
      loading,
      error,
      createRoom,
      joinRoom,
      leaveRoom,
      sendMessage,
      setTyping,
      markRead,
      reset,
    }),
    [
      room,
      messages,
      participants,
      typing,
      unread,
      conn,
      loading,
      error,
      createRoom,
      joinRoom,
      leaveRoom,
      sendMessage,
      setTyping,
      markRead,
      reset,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
