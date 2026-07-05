# WebTogether API Reference

Live Swagger UI is available at `http://localhost:3000/api/docs` when the
backend is running. This document mirrors that for offline reading.

## Base URL

```
http://localhost:3000      # dev
https://api.webtogether.app # prod (when deployed)
```

## Authentication

Most endpoints accept either:

1. **Guest mode** — send a `x-webtogether-userid` header with the user's UUID.
   The backend will look the user up by ID. Suitable for MVP testing.
2. **JWT mode (recommended)** — send `Authorization: Bearer <token>`.
   Mint a token via `POST /auth/guest`.

WebSocket connections require the JWT in `handshake.auth.token`.

## Standard error envelope

Every error response uses this shape:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Room ABCD1234 not found",
  "path": "/rooms/ABCD1234",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

Validation errors include a `details` array:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "displayName must be a string; page must be an object",
  "details": [
    { "property": "displayName", "constraints": { "isString": "..." } },
    { "property": "page", "constraints": { "isDefined": "..." } }
  ]
}
```

---

## REST endpoints

### `POST /auth/guest`

Mint a JWT for an existing user.

**Request body**

```json
{ "userId": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response 200**

```json
{ "token": "eyJhbGciOi...", "expiresIn": "7d" }
```

---

### `PUT /users/:id`

Upsert a guest user. Idempotent — safe to call on every extension boot.

**Request body**

```json
{
  "displayName": "Brave Otter #1234",
  "avatarColor": "#6366f1",
  "avatarUrl": null
}
```

**Response 200** — the public user shape:

```json
{
  "id": "550e8400-...",
  "displayName": "Brave Otter #1234",
  "avatarColor": "#6366f1",
  "avatarUrl": null,
  "isGuest": true
}
```

---

### `POST /rooms`

Create a new room. The host's page metadata becomes the room's page.

**Request body**

```json
{
  "name": "Movie night — Avengers",
  "description": "Watching the new Avengers movie together",
  "page": {
    "url": "https://345movie.net/movie/avengers",
    "title": "Avengers: Endgame — 345movie",
    "hostname": "345movie.net",
    "ogImageUrl": null
  },
  "visibility": "private",
  "maxParticipants": 50,
  "hostUser": {
    "id": "550e8400-...",
    "displayName": "Brave Otter #1234",
    "avatarColor": "#6366f1",
    "avatarUrl": null,
    "isGuest": true
  }
}
```

**Response 201** — `RoomWithMeta`:

```json
{
  "id": "660e8400-...",
  "code": "ABCD1234",
  "name": "Movie night — Avengers",
  "description": "Watching the new Avengers movie together",
  "page": { "url": "...", "title": "...", "hostname": "..." },
  "visibility": "private",
  "hostId": "550e8400-...",
  "host": {
    "id": "550e8400-...",
    "displayName": "Brave Otter #1234",
    "avatarColor": "#6366f1",
    "avatarUrl": null,
    "isGuest": true
  },
  "maxParticipants": 50,
  "participantCount": 1,
  "isLive": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

### `GET /rooms/:idOrCode`

Get a room by UUID or 8-char code. Returns the same `RoomWithMeta` shape
as `POST /rooms`.

---

### `POST /rooms/:idOrCode/join`

Join a room. Idempotent — if the user has previously joined (and not
left), this is a no-op. If they previously left, this re-activates their
participant record and posts a "rejoined" system message.

**Request body**

```json
{
  "user": {
    "id": "770e8400-...",
    "displayName": "Curious Falcon #5678",
    "avatarColor": "#10b981",
    "avatarUrl": null,
    "isGuest": true
  }
}
```

**Response 200** — `RoomWithMeta` with the updated `participantCount`.

---

### `POST /rooms/:idOrCode/leave`

Leave a room. If the user is the host, the room is archived (soft-delete).

**Request body**

```json
{ "userId": "770e8400-..." }
```

**Response 200**

```json
{ "archived": false }
```

---

### `GET /rooms/:idOrCode/messages`

List messages, oldest first. Paginated by `before` cursor.

**Query params**

| Param   | Type     | Default | Description                              |
|---------|----------|---------|------------------------------------------|
| `limit` | int      | 100     | Max 200 per request                      |
| `before`| ISO date | —       | Return messages older than this timestamp|

**Response 200** — `MessageWithAuthor[]`:

```json
[
  {
    "id": "880e8400-...",
    "roomId": "660e8400-...",
    "userId": "550e8400-...",
    "content": "Hey everyone! 🎬",
    "html": "Hey everyone! 🎬",
    "status": "read",
    "createdAt": "2025-01-01T00:00:01.000Z",
    "systemEvent": null,
    "author": {
      "id": "550e8400-...",
      "displayName": "Brave Otter #1234",
      "avatarColor": "#6366f1"
    }
  },
  {
    "id": "990e8400-...",
    "roomId": "660e8400-...",
    "userId": "550e8400-...",
    "content": "Curious Falcon joined",
    "html": "Curious Falcon joined",
    "status": "sent",
    "createdAt": "2025-01-01T00:00:05.000Z",
    "systemEvent": "joined",
    "author": {
      "id": "550e8400-...",
      "displayName": "Brave Otter #1234",
      "avatarColor": "#6366f1"
    }
  }
]
```

---

## WebSocket events

Connection URL: `ws://localhost:3000/socket.io`

Auth: pass `auth: { token: '<jwt>' }` in the Socket.IO handshake options.

### Client → Server

| Event          | Payload                                         | Description                          |
|----------------|-------------------------------------------------|--------------------------------------|
| `room:join`    | `{ roomCode: string }`                          | Join a room                          |
| `room:leave`   | `{ roomCode: string }`                          | Leave the current room               |
| `message:send` | `{ roomCode, content, clientMessageId? }`       | Send a chat message                  |
| `typing:start` | `{ roomCode }`                                  | Notify room that user is typing      |
| `typing:stop`  | `{ roomCode }`                                  | Notify room that user stopped typing |
| `message:read` | `{ roomCode, messageIds: string[] }`            | Mark messages as read                |
| `heartbeat`    | `{ roomCode }`                                  | Refresh presence (auto every 15s)    |

### Server → Client

| Event           | Payload                                                                  |
|-----------------|--------------------------------------------------------------------------|
| `room:joined`   | `{ room: RoomWithMeta, recentMessages: MessageWithAuthor[] }`            |
| `room:left`     | `{ roomId: string }`                                                     |
| `message`       | `MessageWithAuthor`                                                      |
| `message:ack`   | `{ clientMessageId?: string, message: MessageWithAuthor }`               |
| `participants`  | `{ roomId, participants: PresenceEvent[] }`                              |
| `presence`      | `PresenceEvent`                                                          |
| `typing`        | `{ roomId, entries: TypingEntry[] }`                                     |
| `error`         | `{ message: string }`                                                    |

---

## Rate limits

| Scope         | Window | Limit | Notes                                |
|---------------|--------|-------|--------------------------------------|
| Global (HTTP) | 60s    | 120   | Per-IP; configurable via env         |
| Chat messages | 10s    | 20    | Per-user; in-memory token bucket     |

Returns `429 Too Many Requests` with a `Retry-After` header when exceeded.
