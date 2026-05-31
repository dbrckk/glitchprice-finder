interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function getBrowserStorage(): KeyValueStorage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

export function safeReadJson<T>(key: string, fallback: T, storage = getBrowserStorage()): T {
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function safeWriteJson(key: string, value: unknown, storage = getBrowserStorage()) {
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string, storage = getBrowserStorage()) {
  if (!storage?.removeItem) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
