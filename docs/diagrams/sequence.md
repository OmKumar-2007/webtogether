# Sequence Diagrams

All diagrams use [Mermaid](https://mermaid.js.org/) syntax. Render them
in any Markdown viewer that supports Mermaid (GitHub, VS Code with the
Mermaid extension, etc.) or paste into <https://mermaid.live>.

---

## 1. Create Room

```mermaid
sequenceDiagram
    autonumber
    actor U as User A (Host)
    participant E as Extension (Content Script)
    participant B as Backend (NestJS)
    participant DB as PostgreSQL
    participant R as Redis
    participant WS as Socket.IO

    U->>E: Click "Create Room"
    E->>E: detectPageMetadata() → {url, title, hostname}
    E->>B: POST /rooms {page, hostUser}
    B->>B: UsersService.upsertGuest(hostUser)
    B->>DB: INSERT INTO users ... ON CONFLICT
    B->>B: generateRoomCode() (retry on collision)
    B->>DB: INSERT INTO rooms ... (code, hostId, page)
    B->>DB: INSERT INTO room_participants ... (isHost=true)
    B->>DB: INSERT INTO messages ... (systemEvent='joined')
    B-->>E: 201 Created {room}
    E->>E: store ACTIVE_ROOM = {code, id}
    E->>B: socket.connect() (with JWT)
    E->>WS: emit 'room:join' {roomCode}
    WS->>B: WsJwtGuard verifies JWT
    B->>B: RoomsService.join() (idempotent)
    B->>R: PresenceService.onJoin(roomId, user, socketId)
    B->>DB: INSERT INTO presence_events (event='joined')
    WS-->>E: emit 'room:joined' {room, recentMessages}
    WS-->>U: Broadcast 'participants' to room
    E-->>U: Chat panel renders with system msg "You created this room"
```

---

## 2. Join Room (via invite link)

```mermaid
sequenceDiagram
    autonumber
    actor A as User A (Host)
    actor B as User B (Friend)
    participant EA as Extension A
    participant EB as Extension B
    participant W as Web App (webtogether.app)
    participant S as Backend

    A->>EA: Create Room → code "ABCD1234"
    EA->>A: Show invite link webtogether.app/r/ABCD1234
    A->>B: Share link (chat, email, etc.)
    B->>W: Open webtogether.app/r/ABCD1234
    W->>S: GET /rooms/ABCD1234
    S-->>W: {room with page metadata}
    W->>EB: chrome.runtime.sendMessage('WEBTOGETHER_INVITE', {code, room})
    EB->>EB: Show mismatch prompt (if current URL ≠ room.page.url)
    alt Same page
        EB->>S: socket.emit('room:join', {roomCode})
    else Different page
        EB->>B: Show "This room is for <url>. Open page?" YES/NO
        opt User clicks YES
            B->>B: window.open(room.page.url)
            EB->>S: (after page load) socket.emit('room:join')
        end
    end
    S->>S: RoomsService.join() (upsert participant)
    S->>S: PresenceService.onJoin()
    S-->>EA: Broadcast 'presence' (User B joined)
    S-->>EB: emit 'room:joined' with recent messages
    EA-->>A: "User B joined" system message
    EB-->>B: Chat panel renders with message history
```

---

## 3. Send Chat Message

```mermaid
sequenceDiagram
    autonumber
    actor A as User A
    participant EA as Extension A
    participant S as Backend (Socket.IO)
    participant DB as PostgreSQL
    participant R as Redis
    actor B as User B
    participant EB as Extension B

    A->>EA: Type "hi" and press Enter
    EA->>EA: Optimistic insert (clientMessageId)
    EA->>S: emit 'message:send' {roomCode, content, clientMessageId}
    S->>S: WsJwtGuard verifies JWT
    S->>S: MessagesService.send()
    S->>S: replaceEmojiShortnames(content)
    S->>S: sanitizeMessageHtml(withEmoji)
    S->>DB: INSERT INTO messages (content, html, status='sent')
    S->>R: TypingService.stop(roomId, userId)
    S-->>EA: emit 'message:ack' {clientMessageId, message}
    S-->>EB: emit 'message' {saved}
    EA->>EA: Replace optimistic msg with server msg (same clientMessageId)
    EA-->>A: Read receipt: single check ✓
    EB->>EB: Append to messages state
    EB->>EB: Auto-scroll + unread badge++
    EB-->>B: Message appears with author name + timestamp
```

---

## 4. Typing Indicator

```mermaid
sequenceDiagram
    autonumber
    actor A as User A
    participant EA as Extension A
    participant S as Backend
    participant R as Redis
    actor B as User B
    participant EB as Extension B

    A->>EA: Start typing in input
    EA->>EA: Debounce (TYPING_DEBOUNCE_MS = 1500ms)
    EA->>S: emit 'typing:start' {roomCode}
    S->>R: HSET typing:<roomId> <userId> {entry} (TTL 3s)
    S->>S: Broadcast 'typing' to room
    S-->>EB: emit 'typing' {entries}
    EB-->>B: "User A is typing…" with animated dots
    Note over A,R: If A keeps typing, EA re-emits every 1.5s to refresh TTL
    A->>EA: Stop typing (blur or send)
    EA->>S: emit 'typing:stop' {roomCode}
    S->>R: HDEL typing:<roomId> <userId>
    S-->>EB: emit 'typing' {entries: []}
    EB-->>B: Typing indicator disappears
```

---

## 5. Presence & Heartbeat

```mermaid
sequenceDiagram
    autonumber
    participant E as Extension
    participant S as Backend
    participant R as Redis
    participant DB as PostgreSQL

    Note over E,S: On room:join
    E->>S: emit 'room:join'
    S->>R: HSET presence:<roomId> <userId> {entry, socketIds:[socketId]}
    S->>R: SET socket:<socketId> "<roomId>:<userId>" (TTL 90s)
    S->>DB: INSERT presence_events (event='joined')
    S-->>E: emit 'participants' (full list)

    Note over E,S: Every 15s
    loop Heartbeat (PRESENCE_HEARTBEAT_MS = 15s)
        E->>S: emit 'heartbeat' {roomCode}
        S->>R: HSET presence:<roomId> <userId> {lastSeenAt=now, status='online'}
        S->>R: EXPIRE socket:<socketId> 90s
    end

    Note over S,R: Every 1 minute (cron)
    S->>R: SCAN presence:*
    R-->>S: All presence hashes
    S->>R: For each entry: if socketIds empty AND lastSeenAt > 90s → HDEL
    S-->>S: Removed count logged

    Note over E,S: On disconnect
    E->>S: socket disconnects (page close, etc.)
    S->>R: GET socket:<socketId> → "<roomId>:<userId>"
    S->>R: DEL socket:<socketId>
    S->>R: HGET presence:<roomId> <userId>
    S->>R: Remove socketId from entry.socketIds
    alt No more sockets
        S->>R: HSET entry {status='offline'}
        S->>DB: INSERT presence_events (event='left')
        S-->>E: Broadcast 'participants' (updated)
    end
```

---

## 6. Leave Room

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant E as Extension
    participant S as Backend
    participant DB as PostgreSQL
    participant R as Redis

    U->>E: Click "Leave Room" in Participants panel
    E->>S: emit 'room:leave' {roomCode}
    S->>DB: UPDATE room_participants SET left_at = now()
    S->>DB: INSERT messages (systemEvent='left')
    alt User is host
        S->>DB: UPDATE rooms SET archived_at = now()
        S-->>E: emit 'room:left' {roomId}
        S-->>E: (other clients) broadcast 'participants' empty
        Note over E: Host sees overlay reset to Welcome screen
    else User is participant
        S->>R: PresenceService.onDisconnect(socketId)
        S-->>E: emit 'room:left' {roomId}
        S-->>E: (other clients) broadcast 'participants' updated
        Note over E: Leaver's overlay resets; others see "X left" system msg
    end
    E->>E: storage.remove(ACTIVE_ROOM)
```
