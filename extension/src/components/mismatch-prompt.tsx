import { ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from './button';
import type { RoomWithMeta } from '@shared/index';

/**
 * MismatchPrompt — modal shown when the user joined a room but is viewing
 * a different page than the room's host page.
 *
 * "This room is for https://example.com/movie. Open page?"
 *   [YES]  [NO]
 */
export function MismatchPrompt({
  invite,
  onDismiss,
}: {
  invite: { room: RoomWithMeta };
  onDismiss: () => void;
}) {
  const { room } = invite;

  const handleOpen = () => {
    window.open(room.page.url, '_blank', 'noopener,noreferrer');
    onDismiss();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-wt-border bg-wt-surface p-4 shadow-glass-lg animate-slide-up">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-wt-warn/15 p-1.5">
            <AlertCircle className="h-4 w-4 text-wt-warn" />
          </div>
          <h3 className="text-sm font-semibold text-wt-text">Different page</h3>
        </div>
        <p className="mb-3 text-xs text-wt-muted">
          This room is for{' '}
          <span className="font-mono text-wt-text">{room.page.hostname}</span>
          . Open this page to browse together?
        </p>
        <div className="mb-3 truncate rounded-lg bg-wt-surface2 p-2 text-xs text-wt-text">
          {room.page.title}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={onDismiss}>
            No, stay here
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleOpen}
            leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
          >
            Open page
          </Button>
        </div>
      </div>
    </div>
  );
}
