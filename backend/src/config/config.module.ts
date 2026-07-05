import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Validates required environment variables on boot.
 * Throws early if anything is missing so we never start in a broken state.
 */
@Module({
  providers: [
    {
      provide: 'APP_CONFIG_VALIDATED',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const required = [
          'POSTGRES_HOST',
          'POSTGRES_USER',
          'POSTGRES_DB',
          'REDIS_HOST',
          'JWT_SECRET',
        ];
        const missing = required.filter((k) => !config.get<string>(k));
        if (missing.length) {
          throw new Error(
            `Missing required env vars: ${missing.join(', ')}. Check your .env file.`,
          );
        }
        return true;
      },
    },
  ],
})
@Global()
export class AppConfigModule {}
