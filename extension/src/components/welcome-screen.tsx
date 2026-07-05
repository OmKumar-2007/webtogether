import { useState } from 'react';
import { Sparkles, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { Button } from './button';
import { useRoom } from '../context/room-context';
import { useToast } from '../context/toast-context';
import { detectPageMetadata } from '../utils/page-detection';
import type { PageMetadata } from '../utils/page-detection';

/**
 * WelcomeScreen — shown when the overlay is open but no room is active.
 *
 * Two CTAs:
 *   1. Create Room — hosts a new room for the current page.
 *   2. Join with code — joins an existing room via 8-char code.
 */
export function WelcomeScreen() {
  const { createRoom, joinRoom, loading } = useRoom();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const handleCreate = async () => {
    try {
      const meta: PageMetadata = detectPageMetadata();
      await createRoom({ page: meta });
      toast({ title: 'Room created', description: 'Invite friends with the link', variant: 'success' });
    } catch (err) {
      toast({ title: 'Failed to create room', description: (err as Error).message, variant: 'error' });
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      toast({ title: 'Invalid code', description: 'Room codes are 8 chars (A-Z, 0-9)', variant: 'error' });
      return;
    }
    try {
      await joinRoom(code);
      toast({ title: 'Joined room', variant: 'success' });
    } catch (err) {
      toast({ title: 'Failed to join', description: (err as Error).message, variant: 'error' });
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center bg-wt-bg/80 backdrop-blur-md">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-wt-accent to-violet-500 shadow-glass">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-wt-text">Browse the web together</h2>
        <p className="mt-1 text-xs text-wt-muted">
          Create a room for this page and chat with friends in real time.
        </p>
      </div>

      {!showJoin ? (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleCreate}
            loading={loading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Create Room
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={() => setShowJoin(true)}
            leftIcon={<LinkIcon className="h-3.5 w-3.5" />}
          >
            Join with code
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="ABCD1234"
            className="w-full rounded-lg bg-wt-surface2 border border-wt-border px-3 py-2.5 text-center text-base font-mono tracking-[0.4em] text-wt-text placeholder:text-wt-muted/60 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-wt-accent/40"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => {
                setShowJoin(false);
                setJoinCode('');
              }}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={handleJoin}
              loading={loading}
              disabled={joinCode.length !== 8}
            >
              Join
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
