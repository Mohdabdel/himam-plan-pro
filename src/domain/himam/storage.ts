export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function createMemoryStore(initialEntries: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initialEntries));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

export function getBrowserStore(): KeyValueStore | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  return globalThis.localStorage;
}

export function readJsonArray<T>(store: KeyValueStore, key: string): T[] {
  const raw = store.getItem(key);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

export function writeJsonArray<T>(store: KeyValueStore, key: string, records: T[]): T[] {
  store.setItem(key, JSON.stringify(records));
  return records;
}

