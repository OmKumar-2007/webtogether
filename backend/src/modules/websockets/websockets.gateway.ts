import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEventMap,
  ServerToClientEventMap,
} from '@shared/index';
import { PRESENCE_HEARTBEAT_MS } from '@shared/index';
import { RoomsService } from '../rooms/rooms.service';
import { MessagesService } from '../messages/messages.service';
import { PresenceService } from '../presence/presence.service';
import { AuthService } from '../auth/auth.service';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { TypingService } from './typing.service';

/**
 * WebsocketsGateway — single Socket.IO gateway for the entire app.
 *
 * Auth: every socket must present a JWT in `handshake.auth.token`.
 * The guard populates `socket.data.user = { sub, displayName, ... }`.
 *
 * Events (see shared/constants/events.ts for canonical names):
 *   client -> server:  room:join, room:leave, message:send,
 *                      typing:start, typing:stop, message:read, heartbeat
 *   server -> client:  message, message:ack, typing, presence,
 *                      participants, room:joined, room:left, room:updated, error
 *
 * Each socket joins a Socket.IO room named `room:<roomId>` so we can
 * broadcast efficiently.
 */
@WebSocketGateway({
  path: '/socket.io',
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
})
export class WebsocketsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketsGateway.name);
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();

  @WebSocketServer()
  server!: Server<ClientToServerEventMap, ServerToClientEventMap>;

  constructor(
    private readonly rooms: RoomsService,
    private readonly messages: MessagesService,
    private readonly presence: PresenceService,
    private readonly auth: AuthService,
    private readonly typing: TypingService,
  ) {}

  afterInit(server: Server) {
    // Adapter is configured in main.ts via @socket.io/redis-adapter.
    this.logger.log(`WebSocket gateway ready on path /socket.io`);
    void server;
  }

  /** Authenticate on handshake — JWT must be present in auth payload. */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers?.['authorization'] as string | undefined)?.replace(
          'Bearer ',
          '',
        );
      if (!token) throw new Error('Missing token');
      const payload = this.auth.verify(token);
      (client.data as { user: unknown }).user = payload;
      this.logger.debug(`Client connected: ${client.id} (user=${payload.sub})`);
    } catch (err) {
      this.logger.warn(`Connection rejected: ${(err as Error).message}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const timer = this.heartbeatTimers.get(client.id);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(client.id);
    }
    const result = await this.presence.onDisconnect(client.id).catch(() => null);
    if (result?.removed) {
      this.server.to(`room:${result.roomId}`).emit('participants', {
        roomId: result.roomId,
        participants: await this.presence.list(result.roomId),
      });
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  private getUser(client: Socket): { id: string; displayName: string; avatarColor?: string } {
    const data = client.data as { user?: { sub: string; displayName: string } };
    if (!data.user) throw new WsException('Unauthenticated');
    return {
      id: data.user.sub,
      displayName: data.user.displayName,
      avatarColor: (data.user as { avatarColor?: string }).avatarColor,
    };
  }

  /** Join a room. Replays recent messages + current participants. */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('room:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomCode: string },
  ) {
    const user = this.getUser(client);
    const room = await this.rooms.get(body.roomCode);
    await this.rooms.join(body.roomCode, {
      user: { id: user.id, displayName: user.displayName },
    });

    client.join(`room:${room.id}`);

    // Track presence
    const participants = await this.presence.onJoin(
      room.id,
      { id: user.id, displayName: user.displayName, avatarColor: user.avatarColor ?? '#3b82f6' },
      client.id,
    );

    // Start heartbeat timer
    this.startHeartbeat(client, room.id, user.id);

    // Replay recent messages
    const recent = await this.messages.list(room.id, 50);

    // Notify room
    this.server.to(`room:${room.id}`).emit('participants', {
      roomId: room.id,
      participants,
    });
    this.server.to(`room:${room.id}`).emit('presence', {
      userId: user.id,
      displayName: user.displayName,
      avatarColor: user.avatarColor ?? '#3b82f6',
      status: 'online',
      lastSeenAt: new Date().toISOString(),
    });

    client.emit('room:joined', { room, recentMessages: recent });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('room:leave')
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomCode: string },
  ) {
    const user = this.getUser(client);
    const room = await this.rooms.get(body.roomCode);
    await this.rooms.leave(body.roomCode, user.id);
    client.leave(`room:${room.id}`);

    const timer = this.heartbeatTimers.get(client.id);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(client.id);
    }

    const result = await this.presence.onDisconnect(client.id);
    if (result?.removed) {
      this.server.to(`room:${result.roomId}`).emit('participants', {
        roomId: result.roomId,
        participants: await this.presence.list(result.roomId),
      });
    }
    client.emit('room:left', { roomId: room.id });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomCode: string; content: string; clientMessageId?: string },
  ) {
    const user = this.getUser(client);
    const room = await this.rooms.get(body.roomCode);

    if (!body.content?.trim()) throw new WsException('Empty message');

    const saved = await this.messages.send(room.id, user.id, body.content);

    // Ack the sender first so they can replace their optimistic message.
    client.emit('message:ack', {
      clientMessageId: body.clientMessageId,
      message: saved,
    });

    // Broadcast to everyone else in the room
    this.server.to(`room:${room.id}`).emit('message', saved);

    // Auto-clear typing for this user
    await this.typing.stop(room.id, user.id);
    this.broadcastTyping(room.id);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:start')
  async onTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomCode: string },
  ) {
    const user = this.getUser(client);
    const room = await this.rooms.get(body.roomCode);
    await this.typing.start(room.id, {
      id: user.id,
      displayName: user.displayName,
      avatarColor: user.avatarColor ?? '#3b82f6',
    });
    this.broadcastTyping(room.id);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:stop')
  async onTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomCode: string },
  ) {
    const user = this.getUser(client);
    const room = await this.rooms.get(body.roomCode);
    await this.typing.stop(room.id, user.id);
    this.broadcastTyping(room.id);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:read')
  async onMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomCode: string; messageIds: string[] },
  ) {
    const user = this.getUser(client);
    const room = await this.rooms.get(body.roomCode);
    await this.messages.markRead(room.id, user.id, body.messageIds);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('heartbeat')
  async onHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomCode: string },
  ) {
    const user = this.getUser(client);
    const room = await this.rooms.get(body.roomCode);
    await this.presence.onHeartbeat(room.id, user.id, client.id);
  }

  private startHeartbeat(client: Socket, roomId: string, userId: string) {
    if (this.heartbeatTimers.has(client.id)) return;
    const timer = setInterval(() => {
      this.presence.onHeartbeat(roomId, userId, client.id).catch(() => undefined);
    }, PRESENCE_HEARTBEAT_MS);
    this.heartbeatTimers.set(client.id, timer);
  }

  private async broadcastTyping(roomId: string) {
    const entries = await this.typing.list(roomId);
    this.server.to(`room:${roomId}`).emit('typing', { roomId, entries });
  }
}
