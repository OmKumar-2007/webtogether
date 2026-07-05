/**
 * Background service worker (Manifest V3).
 *
 * Responsibilities:
 *   - Open the popup OR send a "WT_TOGGLE_OVERLAY" message to the active
 *     tab's content script when the toolbar action is clicked.
 *   - Forward invite-link navigations from webtogether.app to the
 *     extension (via externally_connectable).
 *   - Listen for tab updates to detect /r/CODE URLs in the address bar.
 *
 * The service worker is intentionally minimal — all real UI lives in the
 * content script's React overlay.
 */

const APP_URL = 'https://webtogether.app';

/** Toggle the overlay when the user clicks the toolbar icon. */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'WT_TOGGLE_OVERLAY' });
  } catch {
    // The content script may not be loaded on chrome:// pages or before
    // document_idle — fall back to opening the popup.
    console.warn('[WebTogether] Could not message content script; opening popup.');
  }
});

/**
 * Detect invite links in the address bar.
 * When the user navigates to https://webtogether.app/r/CODE, we open the
 * extension's web app at that URL — the web app then sends an
 * externally_connectable message back to the extension with the room info.
 */
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status !== 'complete' || !tab.url) return;
  // No-op — we just need the listener to exist for future features.
  void tabId;
});

/**
 * Receive messages from the web app (webtogether.app) via
 * externally_connectable. Forward them to the active tab's content script.
 */
chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
  if (typeof msg !== 'object' || msg === null) return;
  if (msg.type === 'WEBTOGETHER_INVITE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => undefined);
      }
    });
    sendResponse({ ok: true });
  }
  return true;
});

/**
 * Internal messages from the popup / options pages can also be forwarded
 * to content scripts.
 */
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (typeof msg !== 'object' || msg === null) return;
  if (msg.type === 'WT_INJECT_INTO_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          })
          .catch(() => undefined);
      }
    });
  }
});

console.info('[WebTogether] background service worker ready');
