# Architecture

## High-level

```
┌─────────────────────────────────────────────────────────────────┐
│                         Chrome Browser                           │
│                                                                  │
│   ┌─────────────────────┐         ┌────────────────────────┐    │
│   │  Popup              │         │  Content Script         │    │
│   │  (React, popup.html)│         │  (content.js)           │    │
│   └─────────────────────┘         │  ┌──────────────────┐   │    │
│                                   │  │ Shadow DOM Root  │   │    │
│   ┌─────────────────────┐         │  │  ┌────────────┐  │   │    │
│   │  Background         │         │  │  │ Floating   │  │   │    │
│   │  Service Worker     │◀───────▶│  │  │ Button     │  │   │    │
│   │  (background.js)    │  msg    │  │  ├────────────┤  │   │    │
│   └─────────────────────┘         │  │  │ Overlay    │  │   │    │
│                                   │  │  │ (4 tabs)   │  │   │    │
│                                   │  │  └────────────┘  │   │    │
│                                   │  └──────────────────┘   │    │
│                                   └──────────┬─────────────┘    │
└──────────────────────────────────────────────┼──────────────────┘
                                               │ HTTPS (REST + WS)
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Backend                                 │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │                   NestJS App                            │    │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │    │
│   │  │ Auth     │  │ Rooms    │  │ Messages │  │ Users  │ │    │
│   │  │ Module   │  │ Module   │  │ Module   │  │ Module │ │    │
│   │  └──────────┘  └──────────┘  └──────────┘  └────────┘ │    │
│   │  ┌──────────────────────────────────────────────┐     │    │
│   │  │ Websockets Gateway (Socket.IO)                │     │    │
│   │  │  events: message, typing, presence, join...   │     │    │
│   │  └──────────────────────┬───────────────────────┘     │    │
│   └─────────────────────────┼────────────────────────────┘    │
│                             │                                  │
│   ┌──────────────────┐      │      ┌──────────────────┐       │
│   │   PostgreSQL     │◀─────┼─────▶│      Redis       │       │
│   │   users, rooms,  │      │      │  presence,typing,│       │
│   │   participants,  │      │      │  socket map,     │       │
│   │   messages       │      │      │  pub/sub adapter │       │
│   └──────────────────┘      │      └──────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Layered architecture

Each feature module follows the same 4-layer split:

```
┌───────────────────────────────────────┐
│ Controller / Gateway    (transport)   │  HTTP / WebSocket handlers
├───────────────────────────────────────┤
│ Service                  (business)   │  Use-case orchestration
├───────────────────────────────────────┤
│ Repository (TypeORM)     (persistence)│  SQL queries via entities
├───────────────────────────────────────┤
│ Entity / DTO             (data shape) │  TypeORM rows + wire types
└───────────────────────────────────────┘
```

Cross-cutting concerns live in `src/common/`:

- `filters/http-exception.filter.ts` — uniform error envelope
- `guards/jwt-auth.guard.ts`, `guards/ws-jwt.guard.ts` — JWT enforcement
- `interceptors/logging.interceptor.ts` — request logging
- `pipes/` — validation (handled by global `ValidationPipe`)

## Data flow: a chat message

```
User types "hi" in overlay
    │
    ▼
ChatPanel.handleSend()
    │  optimistic insert into messages state
    ▼
socket.emit('message:send', { roomCode, content, clientMessageId })
    │
    ▼ (over WebSocket)
WebsocketsGateway.onMessage()
    │
    ▼
MessagesService.send()  ──▶  sanitize HTML
                         ──▶  replace emoji shortnames
                         ──▶  TypeORM save → Postgres
    │
    ▼
client.emit('message:ack', { clientMessageId, message })   (sender only)
server.to(room).emit('message', saved)                      (everyone in room)
    │
    ▼ (over WebSocket)
Other clients receive 'message' event
    │
    ▼
RoomProvider's socket listener → setMessages([...prev, msg])
    │
    ▼
ChatPanel re-renders, auto-scrolls
```

## Why Shadow DOM?

The content script runs on every webpage. Without isolation, host-page
CSS would leak into our overlay (or our Tailwind utilities would clobber
the host page). `content/index.tsx` creates a closed shadow root and
injects the compiled Tailwind CSS **only inside it** — the host page's
styles can't touch our UI, and our styles can't touch the host page.

## Why Redis?

Three roles:

1. **Presence** — live "who is online" hash per room. Updated on every
   heartbeat; cleaned up by a 1-minute cron. The DB only stores the
   audit log (`presence_events` table).
2. **Typing indicators** — short-TTL hash per room; expires if the user
   stops typing without sending a stop event.
3. **Socket.IO adapter** — `@socket.io/redis-adapter` lets us scale the
   backend horizontally. Any backend instance can broadcast to any
   socket, regardless of which instance it's connected to.

## State management

The extension uses React Context, not Redux. Two top-level providers:

- **UserProvider** — owns the local user identity (UUID, display name,
  avatar color, JWT). Persists in `chrome.storage.local`.
- **RoomProvider** — owns the active room, messages, participants, typing,
  socket connection state. Wires all Socket.IO event listeners.

This keeps the state graph shallow and avoids the boilerplate of Redux
for what is fundamentally a single-room-at-a-time app.

## Future-proofing

The architecture is designed so the following can be added without
rewrites:

| Future feature         | Where it slots in                                          |
|------------------------|------------------------------------------------------------|
| Voice/video chat       | New `MediaStream` service in extension; new `rtc` module in backend for signaling over the existing Socket.IO gateway |
| Screen sharing         | `getDisplayMedia()` in content script; new `screen-share` WS event |
| Playback sync          | New `sync` WS event with `play/pause/seek` payloads; client listens and calls the host video element |
| AI summaries           | New `summaries` module in backend; cron job reads recent messages and calls an LLM API |
| Public rooms           | Already supported — `visibility: 'public'` exists in the schema; just need a `GET /rooms?filter=public` listing endpoint |
| Friend system          | New `friendships` table + `friends` module; UI in popup |
| Cross-browser          | Replace `chrome.*` calls with `browser.*` from webextension-polyfill |
