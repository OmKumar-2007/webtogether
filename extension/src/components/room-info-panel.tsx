import { useState } from 'react';
import { Copy, Check, ExternalLink, Globe, Hash, Lock } from 'lucide-react';
import { useRoom } from '../context/room-context';
import { useToast } from '../context/toast-context';
import { Button } from './button';
import { buildInviteLink } from '@shared/index';

/**
 * RoomInfoPanel — metadata about the current room + invite-link sharing.
 *
 * Shows:
 *   - Room name + visibility badge
 *   - Page URL (with "open in new tab" button)
 *   - Host name
 *   - Created date
 *   - Invite link with copy button
 */
export function RoomInfoPanel() {
  const { room } = useRoom();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!room) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-wt-muted">
        No active room
      </div>
    );
  }

  const appUrl = (import.meta as unknown as { env: { VITE_APP_URL: string } }).env.VITE_APP_URL;
  const inviteLink = buildInviteLink(room.code, appUrl);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: 'Invite link copied', variant: 'success' });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Failed to copy', variant: 'error' });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-wt-border px-4 py-3">
        <div className="text-sm font-medium text-wt-text">Room Info</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name + badge */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="h-4 w-4 text-wt-muted" />
            <span className="text-base font-semibold text-wt-text">{room.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {room.visibility === 'private' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-wt-surface2 px-2 py-0.5 text-[10px] text-wt-muted">
                <Lock className="h-2.5 w-2.5" /> Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-wt-success/15 px-2 py-0.5 text-[10px] text-wt-success">
                <Globe className="h-2.5 w-2.5" /> Public
              </span>
            )}
            <span className="rounded-full bg-wt-surface2 px-2 py-0.5 text-[10px] text-wt-muted">
              {room.code}
            </span>
          </div>
        </div>

        {/* Page */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-wt-muted mb-1">Page</div>
          <a
            href={room.page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 rounded-lg bg-wt-surface2 p-2.5 hover:bg-wt-border/50 transition-colors"
          >
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-wt-muted group-hover:text-wt-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-wt-text">{room.page.title}</div>
              <div className="truncate text-xs text-wt-muted">{room.page.hostname}</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-wt-muted" />
          </a>
        </div>

        {/* Host */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-wt-muted mb-1">Host</div>
          <div className="text-sm text-wt-text">{room.host.displayName}</div>
        </div>

        {/* Created */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-wt-muted mb-1">Created</div>
          <div className="text-sm text-wt-text">
            {new Date(room.createdAt).toLocaleString()}
          </div>
        </div>

        {/* Invite */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-wt-muted mb-1.5">
            Invite link
          </div>
          <div className="rounded-lg bg-wt-surface2 p-2.5">
            <div className="mb-2 truncate text-xs text-wt-muted font-mono">{inviteLink}</div>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={copyInvite}
              leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {copied ? 'Copied!' : 'Copy invite link'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
