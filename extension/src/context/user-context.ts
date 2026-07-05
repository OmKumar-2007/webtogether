import { createContext, useContext } from 'react';
import type { LocalUser } from '../types/storage';

/**
 * UserContext — the local user identity, plus auth state.
 *
 * On first launch, the extension generates a UUID locally, upserts it
 * via the backend, and mints a JWT. We keep that JWT in chrome.storage
 * so it survives page reloads.
 */
export interface UserContextValue {
  user: LocalUser | null;
  token: string | null;
  ready: boolean;
  error?: string;
  /** Update display name / avatar. Persists locally + upserts to backend. */
  updateProfile: (patch: Partial<Pick<LocalUser, 'displayName' | 'avatarColor' | 'avatarUrl'>>) => Promise<void>;
  /** Regenerate the user identity (sign-out equivalent for guests). */
  resetIdentity: () => Promise<void>;
}

export const UserContext = createContext<UserContextValue | null>(null);

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
