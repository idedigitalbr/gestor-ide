import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

export const CACHE_STORAGE_KEY = "ide_gestor_react_query_cache_v1";

/**
 * Storage assíncrono para IndexedDB via idb-keyval, seguro para SSR.
 */
const idbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    try {
      const val = await get<string>(key);
      return val ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      await set(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      await del(key);
    } catch {}
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: CACHE_STORAGE_KEY,
  throttleTime: 1000,
});
