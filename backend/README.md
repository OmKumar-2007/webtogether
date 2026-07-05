# WebTogether Backend

NestJS + Socket.IO + Redis + PostgreSQL backend for the WebTogether Chrome extension.

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm migration:run
pnpm dev
```

Server runs on `http://localhost:3000`. Swagger UI at `/api/docs`.

## Architecture

```
src/
├── main.ts                  # Bootstrap: helmet, CORS, validation, swagger
├── app.module.ts            # Root module
├── common/                  # Cross-cutting concerns
│   ├── decorators/
│   ├── filters/             # HttpExceptionFilter
│   ├── guards/              # JwtAuthGuard, WsJwtGuard
│   └── interceptors/        # LoggingInterceptor
├── config/                  # AppConfigModule, TypeOrmConfigService
├── database/
│   ├── entities/            # TypeORM entities (User, Room, ...)
│   ├── migrations/          # SQL migrations
│   └── data-source.ts       # CLI DataSource for `pnpm typeorm`
└── modules/
    ├── auth/                # Guest JWT mint
    ├── users/               # User CRUD
    ├── rooms/               # Room + participant CRUD
    ├── messages/            # Message persistence
    ├── presence/            # Live presence (Redis + audit log)
    ├── redis/               # Shared Redis client
    └── websockets/          # Socket.IO gateway + typing tracker
```

## API

See `http://localhost:3000/api/docs` for live Swagger UI.

| Method | Path                              | Description                          |
|--------|-----------------------------------|--------------------------------------|
| POST   | `/auth/guest`                     | Mint a JWT for an existing user      |
| PUT    | `/users/:id`                      | Upsert guest user                    |
| GET    | `/users/:id`                      | Get a user                           |
| POST   | `/rooms`                          | Create a room                        |
| GET    | `/rooms/:idOrCode`                | Get a room by id or 8-char code      |
| POST   | `/rooms/:idOrCode/join`           | Join a room (idempotent)             |
| POST   | `/rooms/:idOrCode/leave`          | Leave a room                         |
| GET    | `/rooms/:idOrCode/messages`       | List messages (paginated)            |

WebSocket events at `/socket.io` — see `shared/src/constants/events.ts`.

## Database

PostgreSQL with TypeORM. Auto-migrations on boot when
`DATABASE_MIGRATIONS_RUN=true`. To generate a new migration:

```bash
pnpm migration:generate -- src/database/migrations/<Name>
```

## Docker

```bash
docker build -t webtogether-backend .
docker run -p 3000:3000 --env-file .env webtogether-backend
```

Or use the root `docker/docker-compose.yml` for the full stack.
