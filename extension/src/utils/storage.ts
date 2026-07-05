/** Wraps chrome.storage.local in a Promise-based API with defaults. */
export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], (result) => {
          resolve((result[key] as T) ?? fallback);
        });
      } catch {
        // Service workers may not have chrome.storage at boot in tests.
        resolve(fallback);
      }
    });
  },

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [key]: value }, resolve);
      } catch {
        resolve();
      }
    });
  },

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove(key, resolve);
      } catch {
        resolve();
      }
    });
  },

  /** Subscribe to storage changes for a specific key. Returns an unsubscribe fn. */
  onKey<T>(key: string, cb: (value: T | undefined) => void): () => void {
    const listener = (changes: { [k: string]: chrome.storage.StorageChange }, _area: string) => {
      if (key in changes) cb(changes[key].newValue as T | undefined);
    };
    try {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    } catch {
      return () => undefined;
    }
  },
};
