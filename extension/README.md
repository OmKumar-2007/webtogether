# WebTogether Chrome Extension

A Chrome Extension (MV3) that adds a social chat layer to any webpage.

## Quick start

```bash
pnpm install
pnpm --filter @webtogether/extension dev      # watch build
# or
pnpm --filter @webtogether/extension build    # one-shot build -> ./dist
```

Then load it into Chrome:

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

### Generating icons

```bash
pnpm add -D sharp
node scripts/gen-icons.mjs
```

## Architecture

```
src/
├── background/index.ts     # MV3 service worker (toolbar click, message routing)
├── content/index.tsx       # Content script — mounts React overlay into Shadow DOM
├── popup/                  # Toolbar popup React app
│   ├── main.tsx
│   └── popup.tsx
├── options/                # Full-tab options page React app
│   ├── main.tsx
│   └── options.tsx
├── overlay/                # (reserved — overlay is mounted by content/index.tsx)
├── components/             # Reusable UI components
│   ├── avatar.tsx
│   ├── button.tsx
│   ├── chat-panel.tsx
│   ├── floating-button.tsx
│   ├── mismatch-prompt.tsx
│   ├── overlay.tsx         # Main 4-tab overlay container
│   ├── participants-panel.tsx
│   ├── room-info-panel.tsx
│   ├── settings-panel.tsx
│   ├── toast-viewport.tsx
│   └── welcome-screen.tsx
├── context/                # React context providers (state)
│   ├── room-context.ts     # Active room + chat + presence state
│   ├── room-provider.tsx
│   ├── toast-context.tsx
│   ├── user-context.ts     # Local user identity + JWT
│   └── user-provider.tsx
├── hooks/
│   └── use-invite-flow.ts  # Invite-link detection / mismatch prompt
├── services/
│   ├── api.ts              # REST client (fetch wrapper)
│   └── socket.ts           # Singleton Socket.IO client
├── types/
│   └── storage.ts          # Local-storage keys + types
├── utils/
│   ├── cx.ts               # Classnames helper
│   ├── page-detection.ts   # URL/title/hostname detection
│   ├── storage.ts          # chrome.storage wrapper
│   ├── time.ts             # Time formatting helpers
│   └── uuid.ts             # UUID + random display name
└── styles/
    └── global.css          # Tailwind entry + scrollbar styling
```

### Why Shadow DOM?

The content script runs on **every** webpage. Without Shadow DOM, the host
page's CSS could leak into our overlay (or vice versa) and break the UI.
The `ensureHost()` function in `content/index.tsx` creates a closed shadow
root and injects our Tailwind-compiled CSS only inside it.

### State management

We use React Context (no Redux). Two top-level providers:

- **UserProvider** — owns the local user identity (UUID + display name + JWT)
- **RoomProvider** — owns the active room, message list, participant list,
  typing indicators, and socket connection state

The floating button calls `setIsOpen(true)` to mount the `<Overlay />`,
which wraps the rest of the providers.

### Build

Vite produces four entry points:

| Entry      | Output           | Purpose                          |
|------------|------------------|----------------------------------|
| background | background.js    | MV3 service worker               |
| content    | content.js       | Content script (overlay mount)   |
| popup      | popup.html + js  | Toolbar popup                    |
| options    | options.html + js| Options page                     |

`vite-plugin-static-copy` copies `manifest.json` and `icons/` into `dist/`
verbatim. Load `dist/` as an unpacked extension in Chrome.

### Environment

Set in `vite.config.ts` (or via env vars at build time):

| Variable           | Default                  | Purpose                          |
|--------------------|--------------------------|----------------------------------|
| VITE_BACKEND_URL   | http://localhost:3000    | REST + WebSocket backend URL     |
| VITE_APP_URL       | https://webtogether.app  | Base URL for invite links        |

### Permissions

| Permission   | Why                                       |
|--------------|-------------------------------------------|
| storage      | chrome.storage.local for user/token       |
| activeTab    | Query the active tab for messaging        |
| scripting    | Programmatically inject content script    |
| tabs         | Listen to tab updates for invite detection|
| `<all_urls>` | Run content script on every webpage       |

## Dev workflow

```bash
pnpm --filter @webtogether/extension dev
# Make changes; reload the extension in chrome://extensions
```

For hot-reload of the popup/options page, run `pnpm dev` and visit the
Vite dev server URL (typically `http://localhost:5173/popup.html`).

## Production packaging

```bash
pnpm --filter @webtogether/extension build
node scripts/package.mjs
# → webtogether-extension.zip ready for upload to Chrome Web Store
```
