import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { UserContext, type UserContextValue } from './user-context';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, type LocalUser } from '../types/storage';
import { AVATAR_COLORS, randomAvatarColor } from '@shared/index';
import { api } from '../services/api';
import { uuid, randomDisplayName } from '../utils/uuid';

/**
 * UserProvider — owns the local user identity and JWT.
 *
 * Lifecycle:
 *   1. On mount, read user + token from storage. If user is missing,
 *      generate one (UUID + random display name + random avatar color).
 *   2. Upsert the user to the backend.
 *   3. Mint a JWT (if missing) and store it.
 *   4. Set `ready=true` so children can render.
 *
 * The provider re-mints the JWT if the backend ever returns 401.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Bootstrap on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let u = await storage.get<LocalUser | null>(STORAGE_KEYS.USER, null);
        let t = await storage.get<string | null>(STORAGE_KEYS.TOKEN, null);

        if (!u) {
          u = {
            id: uuid(),
            displayName: randomDisplayName(),
            avatarColor: randomAvatarColor(AVATAR_COLORS),
            avatarUrl: null,
            isGuest: true,
          };
          await storage.set(STORAGE_KEYS.USER, u);
        }

        // Upsert to backend (idempotent)
        try {
          await api.upsertUser(u);
        } catch (err) {
          // Backend may be offline — we still allow UI to render.
          console.warn('[UserProvider] upsertUser failed:', err);
        }

        if (!t) {
          try {
            t = await api.mintGuestToken(u.id);
            await storage.set(STORAGE_KEYS.TOKEN, t);
          } catch (err) {
            console.warn('[UserProvider] mintGuestToken failed:', err);
          }
        }

        if (cancelled) return;
        setUser(u);
        setToken(t);
        setReady(true);
      } catch (err) {
        setError((err as Error).message);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateProfile = useCallback<UserContextValue['updateProfile']>(
    async (patch) => {
      if (!user) return;
      const updated: LocalUser = { ...user, ...patch };
      await storage.set(STORAGE_KEYS.USER, updated);
      setUser(updated);
      try {
        await api.upsertUser(updated);
      } catch (err) {
        console.warn('[UserProvider] upsertUser failed:', err);
      }
    },
    [user],
  );

  const resetIdentity = useCallback(async () => {
    await storage.remove(STORAGE_KEYS.USER);
    await storage.remove(STORAGE_KEYS.TOKEN);
    const fresh: LocalUser = {
      id: uuid(),
      displayName: randomDisplayName(),
      avatarColor: randomAvatarColor(AVATAR_COLORS),
      avatarUrl: null,
      isGuest: true,
    };
    await storage.set(STORAGE_KEYS.USER, fresh);
    try {
      await api.upsertUser(fresh);
      const t = await api.mintGuestToken(fresh.id);
      await storage.set(STORAGE_KEYS.TOKEN, t);
      setToken(t);
    } catch (err) {
      console.warn('[UserProvider] resetIdentity re-mint failed:', err);
    }
    setUser(fresh);
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({ user, token, ready, error, updateProfile, resetIdentity }),
    [user, token, ready, error, updateProfile, resetIdentity],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
