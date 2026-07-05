/**
 * User identity. For the MVP, users can be anonymous (no JWT) — in that case
 * `id` is a randomly generated client-side UUID and `isGuest` is true.
 * Future: full JWT-backed account system.
 */
export interface User {
  id: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  isGuest: boolean;
  createdAt: string;
}

/** Public-safe user shape (no email, no tokens). */
export type PublicUser = Pick<
  User,
  'id' | 'displayName' | 'avatarColor' | 'avatarUrl' | 'isGuest'
>;

/** Request payload to create or update a user. */
export interface UpsertUserDto {
  displayName: string;
  avatarColor?: string;
  avatarUrl?: string | null;
}
