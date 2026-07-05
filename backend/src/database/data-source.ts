import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Standalone DataSource used by the TypeORM CLI for migrations.
 * The NestJS app uses TypeOrmConfigService instead, but the same env vars apply.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'webtogether',
  password: process.env.POSTGRES_PASSWORD ?? 'webtogether',
  database: process.env.POSTGRES_DB ?? 'webtogether',
  entities: [__dirname + '/entities/*.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: process.env.DATABASE_SYNC === 'true',
  logging: process.env.LOG_LEVEL === 'debug',
});

export default AppDataSource;
