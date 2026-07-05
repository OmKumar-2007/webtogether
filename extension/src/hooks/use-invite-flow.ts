import { useCallback, useEffect, useState } from 'react';
import { useRoom } from '../context/room-context';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../types/storage';
import { isSamePage } from '../utils/page-detection';
import type { RoomWithMeta } from '@shared/index';

/**
 * useInviteFlow — handles the "user clicked an invite link" UX.
 *
 * Two triggers:
 *   1. The extension's `externally_connectable` receives a message from
 *      https://webtogether.app/r/CODE with the room info.
 *   2. The host page URL itself contains `/r/CODE` (less common).
 *
 * On trigger, we:
 *   - Persist the pending invite in chrome.storage
 *   - If the overlay is open, the user sees the MismatchPrompt (if needed)
 *   - If the overlay is closed, open it automatically.
 */
export interface PendingInvite {
  code: string;
  room: RoomWithMeta;
}

export function useInviteFlow() {
  const { room, joinRoom } = useRoom();
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);

  // On mount, check for a pending invite in storage
  useEffect(() => {
    (async () => {
      const pending = await storage.get<PendingInvite | null>(STORAGE_KEYS.INVITE_PENDING, null);
      if (pending) setPendingInvite(pending);
    })();
  }, []);

  // Listen for externally-connectable messages from the web app
  useEffect(() => {
    const listener = (msg: unknown) => {
      if (typeof msg !== 'object' || msg === null) return;
      const m = msg as { type?: string; code?: string; room?: RoomWithMeta };
      if (m.type === 'WEBTOGETHER_INVITE' && m.code && m.room) {
        const invite: PendingInvite = { code: m.code, room: m.room };
        setPendingInvite(invite);
        void storage.set(STORAGE_KEYS.INVITE_PENDING, invite);
      }
    };
    try {
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    } catch {
      // No chrome runtime — skip
    }
  }, []);

  /** Decide whether the mismatch prompt should fire. */
  const shouldShowMismatch = useCallback(
    (invite: PendingInvite): boolean => {
      if (!room) return false;
      return !isSamePage(window.location.href, invite.room.page.url);
    },
    [room],
  );

  const acceptInvite = useCallback(async () => {
    if (!pendingInvite) return;
    await joinRoom(pendingInvite.code);
    await storage.remove(STORAGE_KEYS.INVITE_PENDING);
    setPendingInvite(null);
  }, [pendingInvite, joinRoom]);

  const clearPending = useCallback(async () => {
    await storage.remove(STORAGE_KEYS.INVITE_PENDING);
    setPendingInvite(null);
  }, []);

  return {
    pendingInvite: pendingInvite && shouldShowMismatch(pendingInvite) ? pendingInvite : null,
    clearPending,
    acceptInvite,
  };
}
