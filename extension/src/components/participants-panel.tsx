import { Crown, LogOut, Users } from 'lucide-react';
import { Avatar } from './avatar';
import { useRoom } from '../context/room-context';
import { useUser } from '../context/user-context';
import { Button } from './button';
import { useToast } from '../context/toast-context';
import { cx } from '../utils/cx';

/**
 * ParticipantsPanel — shows everyone currently in the room.
 *
 * Groups:
 *   - Host (always at top, with crown)
 *   - Online participants (sorted by name)
 *   - Idle participants
 *   - Offline participants (last seen time)
 */
export function ParticipantsPanel() {
  const { room, participants, leaveRoom } = useRoom();
  const { user } = useUser();
  const { toast } = useToast();

  if (!room) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-wt-muted">
        No active room
      </div>
    );
  }

  const sorted = [...participants].sort((a, b) => {
    const order = { online: 0, idle: 1, offline: 2 } as const;
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return a.displayName.localeCompare(b.displayName);
  });

  const host = sorted.find((p) => p.userId === room.hostId);
  const others = sorted.filter((p) => p.userId !== room.hostId);

  const handleLeave = async () => {
    try {
      await leaveRoom();
      toast({ title: 'Left the room', variant: 'info' });
    } catch (err) {
      toast({
        title: 'Failed to leave',
        description: (err as Error).message,
        variant: 'error',
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-wt-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-wt-text">
          <Users className="h-4 w-4 text-wt-muted" />
          Participants
          <span className="rounded-full bg-wt-surface2 px-1.5 py-0.5 text-[10px] text-wt-muted">
            {participants.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {host && <ParticipantRow participant={host} isHost />}
        {others.map((p) => (
          <ParticipantRow
            key={p.userId}
            participant={p}
            isYou={p.userId === user?.id}
          />
        ))}
        {participants.length === 0 && (
          <div className="p-6 text-center text-xs text-wt-muted">
            Nobody is online right now.
          </div>
        )}
      </div>

      <div className="border-t border-wt-border p-3">
        <Button
          variant="danger"
          size="md"
          className="w-full"
          onClick={handleLeave}
          leftIcon={<LogOut className="h-4 w-4" />}
        >
          Leave Room
        </Button>
      </div>
    </div>
  );
}

function ParticipantRow({
  participant,
  isHost,
  isYou,
}: {
  participant: { userId: string; displayName: string; avatarColor: string; status: string; lastSeenAt: string };
  isHost?: boolean;
  isYou?: boolean;
}) {
  const status = participant.status as 'online' | 'idle' | 'offline';
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-wt-surface2/60">
      <Avatar
        name={participant.displayName}
        color={participant.avatarColor}
        size={32}
        presence={status}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-wt-text">
            {participant.displayName}
          </span>
          {isHost && <Crown className="h-3 w-3 text-wt-warn shrink-0" />}
          {isYou && (
            <span className="rounded bg-wt-surface2 px-1.5 py-0.5 text-[10px] text-wt-muted">
              You
            </span>
          )}
        </div>
        <div className={cx('text-[11px]', status === 'online' ? 'text-wt-success' : 'text-wt-muted')}>
          {status === 'online' ? 'Online' : status === 'idle' ? 'Idle' : 'Offline'}
        </div>
      </div>
    </div>
  );
}
