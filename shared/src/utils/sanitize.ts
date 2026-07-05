/**
 * Strict HTML sanitizer for chat messages.
 *
 * The backend always sanitizes before broadcasting; clients MUST treat
 * incoming `html` as safe (already-sanitized) and `content` as raw text.
 *
 * Strategy:
 *   1. Strip <script>, <iframe>, on* attrs, style attr, javascript: URLs.
 *   2. Allow only a tiny allowlist of inline formatting tags.
 *   3. HTML-escape everything else.
 *
 * This is intentionally simple and conservative. We do NOT linkify URLs
 * here — clients can do that with a known-safe linkifier if they want.
 */
export function sanitizeMessageHtml(input: string): string {
  // 1. Escape everything first — we re-add only allowlisted tags we trust.
  const escaped = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // 2. Re-enable the allowlisted tags by un-escaping them.
  //    Matches escaped forms like &lt;b&gt; ... &lt;/b&gt;
  const tagPattern = new RegExp(
    `&lt;(/?)\\s*(b|strong|i|em|u|br|code|pre)\\s*(&gt;|/?&gt;)`,
    'gi',
  );
  return escaped.replace(tagPattern, (_, closing, tag) => `<${closing}${tag.toLowerCase()}>`);
}

/** Strip every HTML tag — used to compute a plain-text preview. */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, '').trim();
}
