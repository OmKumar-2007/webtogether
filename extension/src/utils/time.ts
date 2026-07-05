/**
 * Format a timestamp as a short relative string ("now", "5m", "2h", "Mar 4").
 * Used in the chat list to keep timestamps scannable.
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Format a timestamp as HH:MM (24-hour, locale-aware). */
export function formatClockTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Group consecutive messages by the same author within a 5-minute window. */
export function shouldGroupWith(prev: { userId: string; createdAt: string }, curr: { userId: string; createdAt: string }): boolean {
  if (prev.userId !== curr.userId) return false;
  const a = new Date(prev.createdAt).getTime();
  const b = new Date(curr.createdAt).getTime();
  return Math.abs(b - a) < 5 * 60_000;
}
