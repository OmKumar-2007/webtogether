# Database ER Diagram

```mermaid
erDiagram
    users ||--o{ rooms : "hosts"
    users ||--o{ room_participants : "joins"
    rooms ||--o{ room_participants : "has"
    rooms ||--o{ messages : "contains"
    users ||--o{ messages : "authors"
    rooms ||--o{ presence_events : "tracks"
    users ||--o{ presence_events : "has"

    users {
        uuid id PK
        varchar(64) display_name
        varchar(16) avatar_color
        varchar(512) avatar_url
        boolean is_guest
        varchar(320) email UK
        varchar(255) password_hash
        timestamptz created_at
        timestamptz updated_at
    }

    rooms {
        uuid id PK
        varchar(8) code UK
        varchar(128) name
        varchar(512) description
        jsonb page
        varchar(16) visibility
        uuid host_id FK
        int max_participants
        timestamptz created_at
        timestamptz updated_at
        timestamptz archived_at
    }

    room_participants {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        boolean is_host
        timestamptz left_at
        timestamptz created_at
        timestamptz updated_at
    }

    messages {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        text content
        text html
        varchar(16) status
        varchar(32) system_event
        timestamptz created_at
    }

    presence_events {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        varchar(16) event
        varchar(64) socket_id
        timestamptz created_at
    }
```

## Notes

- **`users`** — single table for both guest and full-account users. `is_guest` distinguishes them; `email`/`password_hash` are nullable for guests.
- **`rooms`** — page metadata is stored as JSONB (no separate `pages` table) because it's write-once at room creation. `archived_at` is a soft-delete flag.
- **`room_participants`** — unique constraint on `(room_id, user_id)` ensures a user can be in a room at most once. `left_at` is nullable so we can re-activate on rejoin (preserves the original join timestamp for history).
- **`messages`** — both `content` (raw text) and `html` (sanitized + emoji-replaced) are stored so we never re-sanitize on read. `system_event` is set for join/leave/clear messages and rendered differently by the UI.
- **`presence_events`** — append-only audit log. The **live** presence state lives in Redis, not here. This table is for analytics (session length, return rate, etc.).

## Indexes

| Table                | Index                                  | Purpose                              |
|----------------------|----------------------------------------|--------------------------------------|
| `users`              | `idx_users_display_name`               | Search by name (future friend system)|
| `rooms`              | `uniq_rooms_code` (UNIQUE)             | Lookup by 8-char code                |
| `rooms`              | `idx_rooms_host_id`                    | List rooms by host                   |
| `rooms`              | `idx_rooms_visibility`                 | Filter public rooms (future)         |
| `room_participants`  | `uniq_room_user` (UNIQUE)              | One row per (room, user)             |
| `room_participants`  | `idx_participants_room_id`             | List participants in a room          |
| `room_participants`  | `idx_participants_user_id`             | List rooms a user is in              |
| `messages`           | `idx_messages_room_created`            | Paginated message fetch (DESC)       |
| `messages`           | `idx_messages_user_id`                 | "Messages by user" report            |
| `presence_events`    | `idx_presence_room_created`            | Per-room activity history            |
| `presence_events`    | `idx_presence_user_id`                 | Per-user activity history            |
