import { Global, Module, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * RedisModule — provides a single shared Redis client.
 *
 * Used by:
 *   - WebsocketsModule (Socket.IO adapter, presence, typing, socket map)
 *   - PresenceModule (heartbeat/idle tracking)
 */
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<RedisClientType> => {
        const client = createClient({
          url: `redis://${config.get('REDIS_HOST', 'localhost')}:${config.get('REDIS_PORT', '6379')}`,
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          database: parseInt(config.get<string>('REDIS_DB', '0'), 10),
        });
        client.on('error', (err) =>
          new Logger('Redis').error(`Redis client error: ${err.message}`, err.stack),
        );
        await client.connect();
        return client as unknown as RedisClientType;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule implements OnModuleDestroy {
  constructor() {}

  async onModuleDestroy() {
    // Client is closed by WebsocketsModule; nothing to do here.
  }
}
