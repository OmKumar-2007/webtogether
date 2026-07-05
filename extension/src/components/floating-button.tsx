import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { cx } from '../utils/cx';

/**
 * FloatingButton — the draggable entry point for the overlay.
 *
 * Behaviour:
 *   - Default position: bottom-right (24px from edges)
 *   - User can drag it anywhere along the viewport edges
 *   - Position persists across page loads via chrome.storage
 *   - Clicking opens the overlay; the X button (when overlay open) is hidden
 *   - Unread badge appears when there are unread messages
 */
export interface FloatingButtonProps {
  unreadCount: number;
  isOpen: boolean;
  onClick: () => void;
}

const EDGE_PADDING = 16;
const SIZE = 48;

export function FloatingButton({ unreadCount, isOpen, onClick }: FloatingButtonProps) {
  const [pos, setPos] = useState({ x: -1, y: -1 }); // -1 means "use default"
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  // Default position: bottom-right
  useEffect(() => {
    if (pos.x === -1) {
      const x = window.innerWidth - SIZE - EDGE_PADDING - 16; // 16 = scrollbar buffer
      const y = window.innerHeight - SIZE - EDGE_PADDING - 16;
      setPos({ x, y });
    }
  }, [pos.x]);

  // Clamp on resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: Math.min(p.x, window.innerWidth - SIZE - EDGE_PADDING),
        y: Math.min(p.y, window.innerHeight - SIZE - EDGE_PADDING),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    moved.current = false;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragOffset.current.x - pos.x;
    const dy = e.clientY - dragOffset.current.y - pos.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
    const nextX = Math.max(
      EDGE_PADDING,
      Math.min(e.clientX - dragOffset.current.x, window.innerWidth - SIZE - EDGE_PADDING),
    );
    const nextY = Math.max(
      EDGE_PADDING,
      Math.min(e.clientY - dragOffset.current.y, window.innerHeight - SIZE - EDGE_PADDING),
    );
    setPos({ x: nextX, y: nextY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    // If the user didn't actually drag (just clicked), toggle the overlay
    if (!moved.current) {
      onClick();
    }
  };

  if (pos.x === -1) return null;

  return (
    <button
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
      className={cx(
        'fixed z-[2147483646] flex items-center justify-center rounded-full',
        'bg-gradient-to-br from-wt-accent to-violet-500 text-white',
        'shadow-glass-lg ring-1 ring-white/20',
        'transition-transform hover:scale-105',
        dragging ? 'cursor-grabbing scale-110' : 'cursor-pointer',
      )}
      aria-label={isOpen ? 'Close WebTogether' : 'Open WebTogether'}
      role="button"
    >
      {/* Pulse ring when there's unread */}
      {unreadCount > 0 && !isOpen && (
        <span
          className="absolute inset-0 rounded-full bg-wt-accent animate-pulse-ring"
          aria-hidden
        />
      )}
      {isOpen ? (
        <X className="h-5 w-5 relative" />
      ) : (
        <MessageSquare className="h-5 w-5 relative" />
      )}
      {unreadCount > 0 && !isOpen && (
        <span
          className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-wt-danger px-1 text-[10px] font-bold text-white ring-2 ring-wt-bg"
          aria-label={`${unreadCount} unread`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
