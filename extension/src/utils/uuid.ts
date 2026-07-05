/**
 * Generate a stable UUID v4 for the local user identity.
 * Uses crypto.randomUUID when available (Chrome ≥ 92), falls back to a
 * polyfill based on crypto.getRandomValues.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Polyfill
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Per RFC 4122 §4.4 — set version and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/** Pick a friendly random display name like "Brave Otter #1234". */
export function randomDisplayName(): string {
  const adjectives = [
    'Brave', 'Curious', 'Sunny', 'Cosmic', 'Crimson', 'Velvet', 'Electric', 'Mellow',
    'Swift', 'Quiet', 'Golden', 'Silver', 'Hidden', 'Lucky', 'Noble', 'Wild',
  ];
  const animals = [
    'Otter', 'Falcon', 'Panda', 'Wolf', 'Dolphin', 'Fox', 'Owl', 'Tiger',
    'Heron', 'Lynx', 'Bison', 'Koala', 'Hawk', 'Seal', 'Moth', 'Yak',
  ];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = animals[Math.floor(Math.random() * animals.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${a} ${b} #${n}`;
}
