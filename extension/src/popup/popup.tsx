import { useEffect, useState } from 'react';
import { MessageSquare, Users, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../components/button';
import { Avatar } from '../components/avatar';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, type LocalUser, type UserSettings } from '../types/storage';
import { useToast } from '../context/toast-context';
import { ToastProvider } from '../context/toast-context';
import { ToastViewport } from '../components/toast-viewport';

/**
 * Popup — the small UI that appears when the user clicks the toolbar icon.
 *
 * Most of the time, the user wants to either:
 *   1. Toggle the floating overlay on the current tab
 *   2. See their current identity
 *   3. Rejoin the last room they were in
 *
 * The popup is intentionally minimal — the full chat UI lives in the
 * content-script overlay.
 */
export function Popup() {
  return (
    <ToastProvider>
      <PopupInner />
      <ToastViewport />
    </ToastProvider>
  );
}

function PopupInner() {
  const { toast } = useToast();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [activeRoom, setActiveRoom] = useState<{ code: string; id: string } | null>(null);
  const [, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    (async () => {
      const [u, room, s] = await Promise.all([
        storage.get<LocalUser | null>(STORAGE_KEYS.USER, null),
        storage.get<{ code: string; id: string } | null>(STORAGE_KEYS.ACTIVE_ROOM, null),
        storage.get<UserSettings>(STORAGE_KEYS.SETTINGS, {} as UserSettings),
      ]);
      setUser(u);
      setActiveRoom(room);
      setSettings(s);
    })();
  }, []);

  const toggleOverlay = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'WT_TOGGLE_OVERLAY' });
      window.close();
    } catch {
      toast({
        title: 'Cannot open on this page',
        description: 'The current page may not allow content scripts.',
        variant: 'warning',
      });
    }
  };

  const rejoin = async () => {
    if (!activeRoom) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'WT_OPEN_OVERLAY',
      });
      await chrome.tabs.sendMessage(tab.id, {
        type: 'WEBTOGETHER_INVITE',
        code: activeRoom.code,
      });
    }
    window.close();
  };

  return (
    <div className="flex flex-col w-[360px] h-[480px] bg-wt-bg text-wt-text">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-wt-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-wt-accent to-violet-500">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">WebTogether</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Identity */}
        {user && (
          <section className="rounded-xl border border-wt-border bg-wt-surface p-3">
            <div className="flex items-center gap-3">
              <Avatar
                name={user.displayName}
                color={user.avatarColor}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{user.displayName}</div>
                <div className="text-xs text-wt-muted">
                  {user.isGuest ? 'Guest' : 'Account'} · {user.id.slice(0, 8)}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Active room */}
        {activeRoom ? (
          <section className="rounded-xl border border-wt-border bg-wt-surface p-3 space-y-2">
            <div className="text-xs uppercase tracking-wide text-wt-muted">
              Active room
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-wt-accent" />
              <span className="font-mono text-sm">{activeRoom.code}</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={rejoin}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Rejoin on this tab
            </Button>
          </section>
        ) : (
          <section className="rounded-xl border border-wt-border bg-wt-surface p-4 text-center">
            <div className="text-sm font-medium mb-1">No active room</div>
            <div className="text-xs text-wt-muted">
              Open the overlay on any page and tap "Create Room" to start.
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={toggleOverlay}
            leftIcon={<MessageSquare className="h-4 w-4" />}
          >
            Open overlay on this tab
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-wt-border px-4 py-2.5">
        <a
          href="https://webtogether.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-wt-muted hover:text-wt-text"
        >
          webtogether.app
          <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
    </div>
  );
}
