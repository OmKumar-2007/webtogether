/**
 * Detects page metadata for the current tab.
 *
 * Used when creating a room — the host's current URL/title/hostname become
 * the room's "page metadata", and other users see this info when they
 * try to join from a different URL.
 */
export interface PageMetadata {
  url: string;
  title: string;
  hostname: string;
  ogImageUrl?: string | null;
}

/** Detect page metadata in a content-script context. */
export function detectPageMetadata(): PageMetadata {
  if (typeof window === 'undefined' || !window.location) {
    return { url: '', title: '', hostname: '' };
  }
  const url = window.location.href;
  const title = document.title || window.location.hostname;
  const hostname = window.location.hostname;
  const ogImageUrl = readOgImage();
  return { url, title, hostname, ogImageUrl };
}

function readOgImage(): string | null {
  const tag = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
  if (!tag) return null;
  const content = tag.content;
  if (!content) return null;
  try {
    // Resolve relative URLs against the page base.
    return new URL(content, window.location.href).toString();
  } catch {
    return null;
  }
}

/** Quick check whether two URLs point to the same page (ignoring fragments). */
export function isSamePage(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return (
      ua.protocol === ub.protocol &&
      ua.hostname === ub.hostname &&
      ua.pathname === ub.pathname &&
      ua.search === ub.search
    );
  } catch {
    return a === b;
  }
}
