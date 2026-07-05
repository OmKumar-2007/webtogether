import '../../styles/global.css';

/**
 * Content script entry point.
 *
 * Runs on every page (per manifest.json content_scripts.matches).
 * Responsibilities:
 *   1. Inject Tailwind stylesheet into the page (so utility classes work)
 *   2. Create a host element + Shadow DOM to isolate our UI
 *   3. Mount the React <FloatingButton /> + <Overlay /> inside the Shadow DOM
 *   4. Listen for runtime messages from the background script
 *
 * The Shadow DOM prevents the host page's CSS from bleeding into our UI
 * and vice versa — critical for a Chrome extension that runs on arbitrary
 * webpages.
 */
import { createRoot } from 'react-dom/client';
import { StrictMode, useEffect, useState } from 'react';
import { FloatingButton } from '../components/floating-button';
import { Overlay } from '../components/overlay';
import { ToastProvider } from '../context/toast-context';
import { RoomProvider } from '../context/room-provider';
import { useRoom } from '../context/room-context';
import { UserProvider } from '../context/user-provider';

// Inline the compiled Tailwind CSS so we can inject it into the Shadow DOM.
// Vite resolves this import to a CSS string at build time when using
// `?inline` query suffix.
import tailwindCss from '../../styles/global.css?inline';

const HOST_ID = 'webtogether-root';

function ensureHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (host) return host;

  host = document.createElement('div');
  host.id = HOST_ID;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';
  document.documentElement.appendChild(host);

  // Attach shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject our stylesheet
  const style = document.createElement('style');
  style.textContent = tailwindCss;
  shadow.appendChild(style);

  // Mount point for React
  const mountPoint = document.createElement('div');
  mountPoint.id = 'wt-mount';
  mountPoint.style.pointerEvents = 'auto';
  shadow.appendChild(mountPoint);

  return host;
}

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useRoom();

  // Open overlay automatically when the user uses the toolbar action
  useEffect(() => {
    const handler = (msg: unknown) => {
      if (typeof msg !== 'object' || msg === null) return;
      const m = msg as { type?: string };
      if (m.type === 'WT_TOGGLE_OVERLAY') setIsOpen((v) => !v);
      if (m.type === 'WT_OPEN_OVERLAY') setIsOpen(true);
    };
    try {
      chrome.runtime.onMessage.addListener(handler);
      return () => chrome.runtime.onMessage.removeListener(handler);
    } catch {
      return;
    }
  }, []);

  return (
    <>
      <FloatingButton
        unreadCount={unreadCount}
        isOpen={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      />
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '80px',
            width: '380px',
            height: '520px',
            maxHeight: 'calc(100vh - 120px)',
            maxWidth: 'calc(100vw - 48px)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)',
            pointerEvents: 'auto',
            zIndex: 2147483646,
          }}
        >
          <Overlay onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}

function mount() {
  // Don't double-mount
  if (document.getElementById(HOST_ID)?.shadowRoot?.getElementById('wt-mount')) {
    return;
  }

  const host = ensureHost();
  const mountPoint = host.shadowRoot?.getElementById('wt-mount');
  if (!mountPoint) return;

  const root = createRoot(mountPoint);
  root.render(
    <StrictMode>
      <UserProvider>
        <ToastProvider>
          <RoomProvider>
            <App />
          </RoomProvider>
        </ToastProvider>
      </UserProvider>
    </StrictMode>,
  );
}

// Run when DOM is ready (manifest sets run_at: document_idle)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
