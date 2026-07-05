import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

/**
 * AuthService — mints JWTs for guest users.
 *
 * For the MVP we don't have a password-based login. Instead:
 *   1. Client generates a UUID locally and upserts via POST /users/:id.
 *   2. Client calls POST /auth/guest to mint a JWT carrying that UUID.
 *   3. JWT is used to authenticate WebSocket connections.
 *
 * Future: add email/password login, OAuth, refresh tokens, etc.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async mintGuestToken(userId: string): Promise<{ token: string; expiresIn: string }> {
    // Verify the user exists; upsertGuest is idempotent and would create
    // a stub record, but we want to fail loudly if the client hasn't
    // upserted yet so we don't mint tokens for phantom users.
    const user = await this.users.get(userId);
    const token = await this.jwt.signAsync({
      sub: user.id,
      displayName: user.displayName,
      isGuest: user.isGuest,
    });
    return { token, expiresIn: '7d' };
  }

  /** Verifies a JWT and returns the payload. Throws on invalid. */
  verify(token: string): { sub: string; displayName: string; isGuest?: boolean } {
    return this.jwt.verify(token);
  }
}
