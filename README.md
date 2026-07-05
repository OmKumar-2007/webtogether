# WebTogether

> A social layer for the internet.

Open **any webpage**, click the extension, and instantly create a room where friends can chat with you while viewing the same page.

![Architecture](docs/diagrams/architecture.png)

## What it does

- 🌐 **Works on any page** — YouTube, Netflix, docs, news, your own dev server, anything.
- 💬 **Real-time chat** — instant messages, typing indicators, read receipts, emoji.
- 👥 **Live presence** — see who's online, idle, or just joined/left.
- 🔗 **One-click invites** — share a short link, your friend joins in one click.
- 🎨 **Beautiful UI** — dark glass aesthetic in the spirit of Discord/Slack/Linear.
- 🔒 **Secure** — JWT auth, message sanitization (XSS-proof), rate limiting.
- 🚀 **Production-ready** — Docker Compose, layered architecture, full TypeScript.

## Monorepo layout

```
webtogether/
├── extension/    # Chrome Extension MV3 (React + Vite + Tailwind)
├── backend/      # NestJS API + Socket.IO + TypeORM
├── shared/       # Types, DTOs, constants shared between the two
├── docker/       # docker-compose.yml for the full stack
└── docs/         # Architecture, install guide, sequence & ER diagrams
```

## Quick start

### 1. Backend + database

```bash
cd docker
cp ../backend/.env.example .env
docker compose up -d
```

Backend is now at `http://localhost:3000`. Swagger at `/api/docs`.

### 2. Chrome extension

```bash
pnpm install
pnpm --filter @webtogether/shared build
pnpm --filter @webtogether/extension build
```

Then load `extension/dist/` as an unpacked extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `extension/dist/`

### 3. Try it

1. Open any webpage (e.g. `https://news.ycombinator.com`)
2. Click the floating WebTogether button (bottom-right)
3. Tap **Create Room**
4. Copy the invite link
5. Open it in another browser/profile — the friend joins instantly

## Documentation

| Doc | What's inside |
|-----|---------------|
| [docs/INSTALL.md](docs/INSTALL.md) | Detailed install guide (Docker, manual, dev) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture overview + diagram |
| [docs/diagrams/sequence.md](docs/diagrams/sequence.md) | Sequence diagrams for create/join/chat flows |
| [docs/diagrams/er.md](docs/diagrams/er.md) | Database ER diagram |
| [docs/api/](docs/api/) | REST + WebSocket API reference (mirrors Swagger) |
| [backend/README.md](backend/README.md) | Backend deep-dive |
| [extension/README.md](extension/README.md) | Extension deep-dive |

## Tech stack

| Layer       | Choice                                            |
|-------------|---------------------------------------------------|
| Extension   | Manifest V3, React 18, Vite 5, Tailwind 3, TS 5  |
| Backend     | NestJS 10, Socket.IO 4, TypeORM 0.3               |
| Database    | PostgreSQL 16                                     |
| Cache       | Redis 7 (presence, typing, pub/sub adapter)       |
| Auth        | JWT (guest-mode for MVP, full accounts planned)   |
| Realtime    | Socket.IO with `@socket.io/redis-adapter`         |
| Container   | Docker, docker-compose                            |

## Security highlights

- ✅ Helmet for hardened HTTP headers
- ✅ Global ValidationPipe with `whitelist` + `forbidNonWhitelisted`
- ✅ All chat HTML sanitized server-side before broadcast (XSS-proof)
- ✅ Class-validator DTOs on every endpoint
- ✅ Per-IP rate limiting (120 req/min global, 20 msg/10s chat)
- ✅ JWT auth on WebSocket handshake
- ✅ Shadow DOM isolation — host page CSS never leaks into the overlay

## Roadmap (future-proofed)

The architecture is intentionally layered so these can be added without rewrites:

- 🎙️ **Voice chat** — WebRTC peer connections, room-scoped SFU
- 🎥 **Video chat** — same WebRTC layer + camera track negotiation
- 🖥️ **Screen sharing** — `getDisplayMedia()` in content script
- ▶️ **Playback sync** — host emits `play/pause/seek` events; clients follow
- 🤖 **AI summaries** — server-side cron generates a daily summary per room
- 🌍 **Public rooms & communities** — `visibility: 'public'` already supported
- 👥 **Friend system** — bidirectional `friendships` table, friend-only rooms
- 🦊 **Cross-browser** — Firefox/Edge/Safari via webextension polyfill

## License

MIT © 2025 WebTogether
