/**
 * Local-storage keys for the extension.
 * Namespaced under `webtogether:` to avoid collisions with host-page storage.
 *
 * Note: chrome.storage.local is preferred over window.localStorage
 * because it survives browser data clearing and is async-friendly.
 */
export const STORAGE_KEYS = {
  USER: 'webtogether:user',
  TOKEN: 'webtogether:token',
  ACTIVE_ROOM: 'webtogether:activeRoom',
  SETTINGS: 'webtogether:settings',
  INVITE_PENDING: 'webtogether:invitePending',
} as const;

/** Local user identity. Created on first launch, persisted forever. */
export interface LocalUser {
  id: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  isGuest: boolean;
}

/** Extension-wide user settings. */
export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  desktopNotifications: boolean;
  showFloatingButton: boolean;
  /** Where the floating button should appear by default. */
  buttonPosition?: { x: number; y: number };
  /** Last room code joined — used by the popup "rejoin" button. */
  lastRoomCode?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  soundEnabled: true,
  desktopNotifications: false,
  showFloatingButton: true,
  buttonPosition: undefined,
  lastRoomCode: undefined,
};
