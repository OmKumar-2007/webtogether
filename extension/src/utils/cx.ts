/**
 * Tiny classnames helper — same API shape as `clsx` but zero deps.
 * We expose `cx` as the canonical name so we can swap implementations.
 */
export type ClassValue = string | number | null | undefined | false | ClassValue[];

export function cx(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string' || typeof input === 'number') {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cx(...input);
      if (inner) out.push(inner);
    }
  }
  return out.join(' ');
}
