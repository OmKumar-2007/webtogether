import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema — creates all five tables and their indexes in one pass.
 *
 * This is the only migration for the MVP. Future migrations should be
 * additive and never destructive on prod data.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "display_name"  varchar(64) NOT NULL,
        "avatar_color"  varchar(16) NOT NULL DEFAULT '#3b82f6',
        "avatar_url"    varchar(512),
        "is_guest"      boolean NOT NULL DEFAULT true,
        "email"         varchar(320) UNIQUE,
        "password_hash" varchar(255),
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        "updated_at"    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_display_name" ON "users" ("display_name")`);

    // rooms
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id"              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code"            varchar(8) NOT NULL,
        "name"            varchar(128) NOT NULL,
        "description"     varchar(512),
        "page"            jsonb NOT NULL,
        "visibility"      varchar(16) NOT NULL DEFAULT 'private',
        "host_id"         uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "max_participants" int NOT NULL DEFAULT 50,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        "archived_at"     timestamptz,
        CONSTRAINT "uniq_rooms_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_rooms_host_id" ON "rooms" ("host_id")`);
    await queryRunner.query(`CREATE INDEX "idx_rooms_visibility" ON "rooms" ("visibility")`);

    // room_participants
    await queryRunner.query(`
      CREATE TABLE "room_participants" (
        "id"         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "room_id"    uuid NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
        "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "is_host"    boolean NOT NULL DEFAULT false,
        "left_at"    timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uniq_room_user" UNIQUE ("room_id", "user_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_participants_room_id" ON "room_participants" ("room_id")`);
    await queryRunner.query(`CREATE INDEX "idx_participants_user_id" ON "room_participants" ("user_id")`);

    // messages
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id"           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "room_id"      uuid NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
        "user_id"      uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "content"      text NOT NULL,
        "html"         text NOT NULL,
        "status"       varchar(16) NOT NULL DEFAULT 'sent',
        "system_event" varchar(32),
        "created_at"   timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_messages_room_created" ON "messages" ("room_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_messages_user_id" ON "messages" ("user_id")`);

    // presence_events
    await queryRunner.query(`
      CREATE TABLE "presence_events" (
        "id"         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "room_id"    uuid NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
        "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "event"      varchar(16) NOT NULL,
        "socket_id"  varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_presence_room_created" ON "presence_events" ("room_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_presence_user_id" ON "presence_events" ("user_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "presence_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "room_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rooms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
