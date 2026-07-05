import { cx } from '../utils/cx';

/**
 * Avatar — colored circle with the user's initials.
 * Falls back to the user's avatarColor when no avatarUrl is set.
 */
export interface AvatarProps {
  name: string;
  color?: string;
  url?: string | null;
  size?: number;
  className?: string;
  /** Show a small presence dot in the bottom-right corner. */
  presence?: 'online' | 'idle' | 'offline';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

const PRESENCE_RING: Record<NonNullable<AvatarProps['presence']>, string> = {
  online: 'bg-wt-success',
  idle: 'bg-wt-warn',
  offline: 'bg-wt-muted/60',
};

export function Avatar({
  name,
  color = '#6366f1',
  url,
  size = 32,
  className,
  presence,
}: AvatarProps) {
  return (
    <div
      className={cx('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-full text-white font-semibold overflow-hidden ring-1 ring-black/10"
        style={{ background: color, fontSize: size * 0.4 }}
      >
        {url ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{initials(name)}</span>
        )}
      </div>
      {presence && (
        <span
          className={cx(
            'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-wt-bg',
            PRESENCE_RING[presence],
          )}
          style={{ width: size * 0.3, height: size * 0.3 }}
          aria-hidden
        />
      )}
    </div>
  );
}
