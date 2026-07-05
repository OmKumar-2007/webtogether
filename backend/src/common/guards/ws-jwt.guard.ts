import { WsException } from '@nestjs/websockets';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

/**
 * WebSocket auth guard — verifies the JWT sent in the handshake auth payload.
 * Guest users send a signed ephemeral token minted by POST /auth/guest.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const client = ctx.switchToWs().getClient<Socket>();
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.headers?.['authorization'] as string | undefined)?.replace(
        'Bearer ',
        '',
      );

    if (!token) {
      throw new WsException('Missing auth token');
    }
    try {
      const payload = this.jwt.verify(token) as { sub: string; displayName: string };
      (client.data as { user: unknown }).user = payload;
      return true;
    } catch {
      throw new WsException('Invalid or expired token');
    }
  }
}
