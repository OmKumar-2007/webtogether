# Docker — WebTogether

One-command full-stack via Docker Compose.

## Quick start

```bash
cd docker
cp ../backend/.env.example .env   # edit JWT_SECRET etc.
docker compose up -d
```

The backend will be at `http://localhost:3000`. Swagger UI at `/api/docs`.

## Services

| Service  | Image             | Port  | Purpose                                  |
|----------|-------------------|-------|------------------------------------------|
| postgres | postgres:16-alpine| 5432  | Persistent storage (rooms, messages)     |
| redis    | redis:7-alpine    | 6379  | Presence, typing, Socket.IO adapter      |
| backend  | (built)           | 3000  | NestJS REST + WebSocket server           |

## Volumes

- `postgres_data` — Postgres data files
- `redis_data` — Redis AOF persistence

## Health checks

Both `postgres` and `redis` have health checks. The `backend` service
waits for both to be healthy before starting.

## Logs

```bash
docker compose logs -f backend     # follow backend logs
docker compose logs -f             # follow all services
```

## Tear down

```bash
docker compose down                # stop + remove containers
docker compose down -v             # also remove volumes (loses all data!)
```

## Production notes

- Set a strong `JWT_SECRET` (≥ 32 random bytes).
- Set `CORS_ORIGIN` to your extension's `https://webtogether.app` (and
  any staging hosts).
- Put the backend behind HTTPS (Caddy, nginx, Cloud Run, etc.) — Chrome
  extensions can only connect to `https://` or `http://localhost` backends
  in production.
- Use a managed Postgres (RDS, Cloud SQL) and Redis (ElastiCache, MemoryStore)
  for HA.
