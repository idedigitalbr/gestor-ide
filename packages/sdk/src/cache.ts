// @gestor-ide/sdk — Camada de Cache Local-First com Memória RAM + IndexedDB
// Permite que qualquer consulta GET responda instantaneamente em 0ms (Stale-While-Revalidate).

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class IdeCrmCache {
  private memory = new Map<string, CacheEntry<unknown>>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private readonly dbName = "ide_gestor_sdk_cache_v1";
  private readonly storeName = "api_cache";

  private getDb(): Promise<IDBDatabase | null> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return Promise.resolve(null);
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open(this.dbName, 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(this.storeName)) {
              db.createObjectStore(this.storeName);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    // 1. Memória RAM (ultrarrápido, ~0.001ms)
    const mem = this.memory.get(key);
    if (mem && mem.data !== undefined) {
      return mem.data as T;
    }

    // 2. Disco persistente via IndexedDB (~0.5ms)
    try {
      const db = await this.getDb();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);
        req.onsuccess = () => {
          const entry = req.result as CacheEntry<T> | undefined;
          if (entry && entry.data !== undefined) {
            this.memory.set(key, entry);
            resolve(entry.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    this.memory.set(key, entry);

    try {
      const db = await this.getDb();
      if (!db) return;
      await new Promise<void>((resolve) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        store.put(entry, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {}
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    for (const k of this.memory.keys()) {
      if (k.startsWith(prefix)) {
        this.memory.delete(k);
      }
    }

    try {
      const db = await this.getDb();
      if (!db) return;
      await new Promise<void>((resolve) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            if (typeof cursor.key === "string" && cursor.key.startsWith(prefix)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => resolve();
      });
    } catch {}
  }

  async clear(): Promise<void> {
    this.memory.clear();
    try {
      const db = await this.getDb();
      if (!db) return;
      await new Promise<void>((resolve) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {}
  }
}

export const crmCache = new IdeCrmCache();
