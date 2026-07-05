import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEventMap,
  ServerToClientEventMap,
} from '@shared/index';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../types/storage';

const BACKEND_URL = (import.meta as unknown as { env: { VITE_BACKEND_URL: string } }).env
  .VITE_BACKEND_URL;

/**
 * Singleton Socket.IO client.
 *
 * Connection lifecycle is managed explicitly:
 *   - connect(token)    opens the socket
 *   - disconnect()      closes it
 *
 * The socket auto-reconnects with exponential backoff (Socket.IO default).
 * Reconnect events are surfaced to subscribers via the connection-state
 * emitter so the UI can show the appropriate banner.
 */
export type WebTogetherSocket = Socket<ServerToClientEventMap, ClientToServerEventMap>;

let socket: WebTogetherSocket | null = null;

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
}

type Listener = (state: ConnectionState) => void;
const listeners = new Set<Listener>();
let currentState: ConnectionState = { connected: false, reconnecting: false };

function emitState() {
  for (const l of listeners) l(currentState);
}

export const connection = {
  get(): ConnectionState {
    return currentState;
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(currentState);
    return () => listeners.delete(fn);
  },
};

/** Connect (or reconnect) the socket with the stored JWT. */
export async function connectSocket(): Promise<WebTogetherSocket> {
  if (socket?.connected) return socket;

  const token = await storage.get<string | null>(STORAGE_KEYS.TOKEN, null);
  if (!token) throw new Error('No JWT — call api.mintGuestToken first');

  if (socket) {
    socket.connect();
    return socket;
  }

  socket = io(BACKEND_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 10_000,
  });

  socket.on('connect', () => {
    currentState = { connected: true, reconnecting: false };
    emitState();
  });
  socket.on('disconnect', (reason) => {
    currentState = {
      connected: false,
      reconnecting: socket?.active ?? false,
      error: reason,
    };
    emitState();
  });
  socket.on('connect_error', (err) => {
    currentState = {
      connected: false,
      reconnecting: socket?.active ?? false,
      error: err.message,
    };
    emitState();
  });
  socket.io.on('reconnect_attempt', () => {
    currentState = { connected: false, reconnecting: true };
    emitState();
  });
  socket.io.on('reconnect_failed', () => {
    currentState = {
      connected: false,
      reconnecting: false,
      error: 'Reconnect failed',
    };
    emitState();
  });

  return socket;
}

/** Disconnect the socket. Safe to call multiple times. */
export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentState = { connected: false, reconnecting: false };
  emitState();
}

/** Get the current socket without forcing a connect (may be null). */
export function getSocket(): WebTogetherSocket | null {
  return socket;
}
