# Installation Guide

Three ways to run WebTogether:

1. **Docker (recommended)** — full stack in one command
2. **Manual** — install each component separately
3. **Dev** — hot-reload everything for development

---

## 1. Docker (recommended)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io) 9+ (for building the extension)
- Chrome / Edge / Brave (any Chromium browser)

### Steps

```bash
# Clone
git clone https://github.com/your-org/webtogether.git
cd webtogether

# Start backend + DB + Redis
cd docker
cp ../backend/.env.example .env
# Edit .env: set JWT_SECRET to a random 32+ char string
docker compose up -d

# Verify backend is up
curl http://localhost:3000/api/docs   # should return Swagger HTML

# Build the extension
cd ..
pnpm install
pnpm --filter @webtogether/shared build
pnpm --filter @webtogether/extension build

# Generate icons (optional, requires sharp)
pnpm --filter @webtogether/extension add -D sharp
pnpm --filter @webtogether/extension exec node scripts/gen-icons.mjs
```

### Load the extension

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder

The WebTogether icon should appear in your toolbar.

### Verify

1. Visit any webpage (e.g. <https://en.wikipedia.org/wiki/Cat>)
2. Click the floating WebTogether button (bottom-right)
3. Tap **Create Room**
4. You should see the chat panel with a system message "You created this room"
5. Copy the invite link from the **Info** tab
6. Open it in an incognito window — the friend joins

---

## 2. Manual

### Postgres + Redis

```bash
# macOS (Homebrew)
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# Ubuntu/Debian
sudo apt install postgresql-16 redis-server
sudo systemctl enable --now postgresql redis-server
```

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set POSTGRES_* and REDIS_* to match your local install

pnpm install
pnpm migration:run       # create schema
pnpm dev                 # start dev server on :3000
```

### Extension

```bash
cd extension
pnpm install
pnpm dev                 # Vite dev server on :5173
```

For the extension to load from source, run `pnpm build` once and load
`extension/dist/` in Chrome (same as the Docker path above).

---

## 3. Dev (hot reload everything)

```bash
# Terminal 1 — backend
cd backend && pnpm dev

# Terminal 2 — extension build watcher
cd extension && pnpm dev

# Terminal 3 — Postgres + Redis (or use docker)
docker run -d --name wt-pg -p 5432:5432 -e POSTGRES_PASSWORD=webtogether postgres:16-alpine
docker run -d --name wt-redis -p 6379:6379 redis:7-alpine
```

Reload the extension in `chrome://extensions` after each code change to the
content script or background worker. The popup and options page support
HMR via Vite's dev server.

---

## Environment variables

See [`backend/.env.example`](../backend/.env.example) for the canonical list.

| Variable                    | Required | Default                  | Purpose                              |
|----------------------------|----------|--------------------------|--------------------------------------|
| `NODE_ENV`                 | yes      | `development`            | Node env                             |
| `PORT`                     | no       | `3000`                   | Backend HTTP port                    |
| `CORS_ORIGIN`              | no       | `*`                      | CORS allowlist                        |
| `POSTGRES_HOST`            | yes      | `localhost`              | Postgres host                         |
| `POSTGRES_PORT`            | no       | `5432`                   | Postgres port                         |
| `POSTGRES_USER`            | yes      | `webtogether`            | Postgres user                         |
| `POSTGRES_PASSWORD`        | yes      | `webtogether`            | Postgres password                     |
| `POSTGRES_DB`              | yes      | `webtogether`            | Postgres database                     |
| `DATABASE_MIGRATIONS_RUN`  | no       | `true`                   | Run migrations on boot                |
| `REDIS_HOST`               | yes      | `localhost`              | Redis host                            |
| `REDIS_PORT`               | no       | `6379`                   | Redis port                            |
| `JWT_SECRET`               | yes      | `change-me`              | JWT signing secret                    |
| `JWT_EXPIRES_IN`           | no       | `7d`                     | JWT TTL                               |
| `APP_URL`                  | no       | `https://webtogether.app`| Base URL for invite links             |
| `RATE_LIMIT_TTL`           | no       | `60`                     | Throttle window (sec)                 |
| `RATE_LIMIT_LIMIT`         | no       | `120`                    | Max requests per window               |

For the extension (set at build time via Vite):

| Variable          | Default                  | Purpose                          |
|-------------------|--------------------------|----------------------------------|
| `VITE_BACKEND_URL`| `http://localhost:3000`  | Backend REST + WS URL            |
| `VITE_APP_URL`    | `https://webtogether.app`| Base URL for invite links        |

---

## Troubleshooting

### "Cannot connect to backend"

1. Verify backend is running: `curl http://localhost:3000/api/docs`
2. Check the extension's console (right-click overlay → Inspect) for socket errors
3. Confirm `VITE_BACKEND_URL` matches your backend (set in `vite.config.ts`, rebuild)
4. If using Docker on Linux, ensure port 3000 isn't firewalled

### "Floating button doesn't appear"

1. Refresh the page
2. Check `chrome://extensions` — make sure the extension is enabled
3. Some Chrome internal pages (`chrome://*`, `chrome-extension://*`) block content scripts — try a normal webpage
4. Inspect the page's DOM — look for `<div id="webtogether-root">` at the end of `<html>`

### "Socket disconnects every minute"

The backend cleans up stale presence every minute. If your client doesn't
heartbeat (which it should automatically every 15s), the server will mark
you offline. Check your network connection and ensure `VITE_BACKEND_URL`
is reachable.

### Database migration fails

```bash
# Drop and recreate the database (loses all data!)
docker compose down -v
docker compose up -d
```

Or, for manual setup:

```bash
psql -U webtogether -d webtogether -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm --filter @webtogether/backend migration:run
```
