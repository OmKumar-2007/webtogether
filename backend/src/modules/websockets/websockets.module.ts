import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { MessagesModule } from '../messages/messages.module';
import { PresenceModule } from '../presence/presence.module';
import { WebsocketsGateway } from './websockets.gateway';
import { TypingService } from './typing.service';

/**
 * WebsocketsModule — exposes Socket.IO gateway + typing tracker.
 *
 * The gateway depends on RoomsService, MessagesService, PresenceService,
 * and AuthService — we import those modules here.
 */
@Module({
  imports: [ConfigModule, AuthModule, RoomsModule, MessagesModule, PresenceModule],
  providers: [WebsocketsGateway, TypingService],
  exports: [WebsocketsGateway],
})
export class WebsocketsModule {}
