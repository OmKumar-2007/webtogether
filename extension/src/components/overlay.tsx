import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Users, Info, Settings as SettingsIcon, X, Wifi, WifiOff } from 'lucide-react';
import { cx } from '../utils/cx';
import { ChatPanel } from './chat-panel';
import { ParticipantsPanel } from './participants-panel';
import { RoomInfoPanel } from './room-info-panel';
import { SettingsPanel } from './settings-panel';
import { ToastViewport } from './toast-viewport';
import { useRoom } from '../context/room-context';
import { WelcomeScreen } from './welcome-screen';
import { MismatchPrompt } from './mismatch-prompt';
import { useInviteFlow } from '../hooks/use-invite-flow';

type Tab = 'chat' | 'participants' | 'info' | 'settings';

/**
 * Overlay — the full-screen WebTogether React app that lives inside the
 * content script's Shadow DOM.
 *
 * IMPORTANT: this component assumes it is rendered INSIDE a <UserProvider>,
 * <ToastProvider>, and <RoomProvider>. The content-script mount point
 * (content/index.tsx) sets those up so the FloatingButton and Overlay
 * share the same state — otherwise we'd open two sockets.
 *
 * Layout (when expanded):
 *   ┌─────────────────────────────┐
 *   │ Header (logo · tabs · close)│
 *   ├─────────────────────────────┤
 *   │                             │
 *   │        Tab content          │
 *   │                             │
 *   ├─────────────────────────────┤
 *   │ Connection bar (if needed)  │
 *   └─────────────────────────────┘
 */
export function Overlay({ onClose }: { onClose: () => void }) {
  return <OverlayInner onClose={onClose} />;
}

function OverlayInner({ onClose }: { onClose: () => void }) {
  const { room, connection, unreadCount } = useRoom();
  const [tab, setTab] = useState<Tab>('chat');
  const { pendingInvite, clearPending } = useInviteFlow();

  // Auto-switch to participants tab when joining, then back to chat
  useEffect(() => {
    if (room) setTab('chat');
  }, [room?.id]);

  const tabs = useMemo(
    () => [
      { id: 'chat' as const, label: 'Chat', icon: MessageSquare, badge: unreadCount },
      { id: 'participants' as const, label: 'People', icon: Users },
      { id: 'info' as const, label: 'Info', icon: Info },
      { id: 'settings' as const, label: 'Settings', icon: SettingsIcon },
    ],
    [unreadCount],
  );

  return (
    <div className="flex h-full flex-col bg-wt-bg/95 backdrop-blur-xl text-wt-text animate-slide-up">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-wt-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Logo />
          <div className="text-sm font-semibold">WebTogether</div>
        </div>
        <div className="flex items-center gap-1">
          {connection.connected ? (
            <span className="flex items-center gap-1 text-[10px] text-wt-success">
              <Wifi className="h-3 w-3" /> Live
            </span>
          ) : connection.reconnecting ? (
            <span className="flex items-center gap-1 text-[10px] text-wt-warn">
              <Wifi className="h-3 w-3 animate-pulse" /> Reconnecting…
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-wt-muted">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-1 rounded-md p-1 text-wt-muted hover:text-wt-text hover:bg-wt-surface2"
            aria-label="Close overlay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex border-b border-wt-border bg-wt-surface/60">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'relative flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors',
                active ? 'text-wt-text' : 'text-wt-muted hover:text-wt-text',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              {t.badge ? (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-wt-accent px-1 text-[9px] font-bold text-white">
                  {t.badge > 99 ? '99+' : t.badge}
                </span>
              ) : null}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-wt-accent" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'chat' && <ChatPanel />}
        {tab === 'participants' && <ParticipantsPanel />}
        {tab === 'info' && <RoomInfoPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </main>

      {/* Mismatch prompt (modal) */}
      {pendingInvite && room && (
        <MismatchPrompt
          invite={pendingInvite}
          onDismiss={() => clearPending()}
        />
      )}

      {/* Welcome screen overlay when no room */}
      {!room && tab === 'chat' && <WelcomeScreen />}

      {/* Toast viewport — positioned within this overlay container */}
      <ToastViewport />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-wt-accent to-violet-500 shadow-md">
      <MessageSquare className="h-4 w-4 text-white" />
    </div>
  );
}
