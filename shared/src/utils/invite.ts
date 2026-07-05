/**
 * Build an invite link for a room code.
 *
 * @param code Room code (e.g. `ABCD1234`)
 * @param appUrl Base app URL; defaults to DEFAULT_APP_URL. The extension
 *               overrides this with its own origin so links open the right
 *               web app for the user.
 */
export function buildInviteLink(code: string, appUrl: string): string {
  const base = appUrl.replace(/\/$/, '');
  return `${base}/r/${code}`;
}

/** Extract a room code from an invite URL. Returns null if not a valid link. */
export function parseInviteLink(url: string): string | null {
  const match = url.match(/\/r\/([A-Z0-9]{8})(?:[/?#]|$)/i);
  if (!match) return null;
  return match[1].toUpperCase();
}

/** Generate a random 8-char room code, A-Z0-9, ambiguous chars removed. */
export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/** Pick a random avatar color from the shared palette. */
export function randomAvatarColor(palette: readonly string[]): string {
  const bytes = randomBytes(1);
  return palette[bytes[0] % palette.length];
}

/**
 * Cross-runtime secure RNG. `globalThis.crypto` is available in all
 * modern browsers, Node 18+, and MV3 service workers — no fallback needed.
 */
function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  (
    globalThis as unknown as {
      crypto: { getRandomValues: (arr: Uint8Array) => Uint8Array };
    }
  ).crypto.getRandomValues(out);
  return out;
}
