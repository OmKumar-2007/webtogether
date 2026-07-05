/** App-wide constants shared between extension and backend. */

export const APP_NAME = 'WebTogether';
export const APP_TAGLINE = 'A social layer for the internet.';

/** Base URL used for invite links. Override with VITE_APP_URL / PUBLIC_APP_URL. */
export const DEFAULT_APP_URL = 'https://webtogether.app';

/** Regex for a valid room code — used by both client validation and DB constraint. */
export const ROOM_CODE_PATTERN = /^[A-Z0-9]{8}$/;

/** Maximum number of participants in a single room. */
export const MAX_PARTICIPANTS_PER_ROOM = 50;

/** Maximum message length after trim. */
export const MAX_MESSAGE_LENGTH = 4000;

/** Typing-indicator debounce window (ms). */
export const TYPING_DEBOUNCE_MS = 1500;

/** Typing-indicator broadcast expiry in Redis (seconds). */
export const TYPING_TTL_SECONDS = 3;

/** Presence heartbeat interval (ms) — clients ping this often. */
export const PRESENCE_HEARTBEAT_MS = 15000;

/** Presence idle threshold (ms) since last heartbeat. */
export const PRESENCE_IDLE_THRESHOLD_MS = 45000;

/** Presence offline threshold (ms) since last heartbeat. */
export const PRESENCE_OFFLINE_THRESHOLD_MS = 90000;

/** Default WebSocket path on the backend. */
export const WS_PATH = '/socket.io';

/** Avatar color palette — clients pick a random one for new guest users. */
export const AVATAR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
] as const;

/** Rate limit defaults for chat messages. */
export const MESSAGE_RATE_LIMIT = {
  windowMs: 10_000,
  max: 20,
};
