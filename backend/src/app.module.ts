import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from './modules/redis/redis.module';
import { WebsocketsModule } from './modules/websockets/websockets.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PresenceModule } from './modules/presence/presence.module';
import { AppConfigModule } from './config/config.module';
import { TypeOrmConfigService } from './config/database.config';

/**
 * Root application module.
 *
 * Layered architecture:
 *   - config: env loading, validation, typeorm factory
 *   - common: cross-cutting concerns (guards, filters, interceptors, pipes)
 *   - modules: feature modules (rooms, messages, presence, etc.)
 */
@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      expandVariables: true,
    }),
    AppConfigModule,

    // Throttler — global rate limiter
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: 60_000,
          limit: 120,
        },
      ],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),

    // Cron jobs (used for presence cleanup)
    ScheduleModule.forRoot(),

    // Feature modules
    RedisModule,
    WebsocketsModule,
    UsersModule,
    AuthModule,
    RoomsModule,
    MessagesModule,
    PresenceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
