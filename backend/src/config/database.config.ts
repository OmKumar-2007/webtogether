import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';

/**
 * TypeORM configuration factory.
 *
 * Reads Postgres connection details from environment variables and
 * registers every entity under src/database/entities.
 *
 * Migrations are run automatically when DATABASE_MIGRATIONS_RUN=true.
 */
@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    return {
      type: 'postgres',
      host: this.config.get<string>('POSTGRES_HOST', 'localhost'),
      port: this.config.get<number>('POSTGRES_PORT', 5432),
      username: this.config.get<string>('POSTGRES_USER', 'webtogether'),
      password: this.config.get<string>('POSTGRES_PASSWORD', 'webtogether'),
      database: this.config.get<string>('POSTGRES_DB', 'webtogether'),
      entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: this.config.get<string>('DATABASE_SYNC', 'false') === 'true',
      migrationsRun: this.config.get<string>('DATABASE_MIGRATIONS_RUN', 'true') === 'true',
      logging: !isProd && this.config.get<string>('LOG_LEVEL') === 'debug',
      ssl: isProd ? { rejectUnauthorized: false } : false,
    };
  }
}
