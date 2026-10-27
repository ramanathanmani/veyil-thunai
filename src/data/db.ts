/**
 * Unified IndexedDB client for Veyil Thunai.
 *
 * Ensures all stores (forecast_cache, settings, exposure_logs)
 * share a single consistent database version (v2) and connection pool,
 * preventing version mismatch deadlocks.
 */

import { openDB, IDBPDatabase } from 'idb';

export const DB_NAME = 'veyil_thunai_db';
export const DB_VERSION = 2;
export const STORE_FORECAST = 'forecast_cache';
export const STORE_SETTINGS = 'settings';
export const STORE_LOGS = 'exposure_logs';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

export function getAppDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_FORECAST)) {
          db.createObjectStore(STORE_FORECAST);
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS);
        }
        if (!db.objectStoreNames.contains(STORE_LOGS)) {
          db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
        }
      },
      blocked() {
        console.warn('[IndexedDB] Database upgrade blocked by another connection');
      },
      blocking() {
        console.warn('[IndexedDB] Connection blocking newer version, closing');
        if (dbPromise) {
          dbPromise.then((db) => db.close()).catch(() => {});
          dbPromise = null;
        }
      },
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/**
 * Executes an IndexedDB operation with a strict timeout fallback.
 * Prevents hanging if the browser IndexedDB implementation stalls or deadlocks.
 */
export async function withDbTimeout<T>(
  operation: (db: IDBPDatabase) => Promise<T>,
  fallback: T,
  timeoutMs: number = 1500
): Promise<T> {
  if (!isIndexedDbAvailable()) {
    return fallback;
  }
  try {
    const db = await Promise.race([
      getAppDB(),
      new Promise<null>((res) => setTimeout(() => res(null), timeoutMs)),
    ]);
    if (!db) {
      console.warn(`[IndexedDB] Operation timed out after ${timeoutMs}ms, using fallback`);
      return fallback;
    }
    return await Promise.race([
      operation(db),
      new Promise<T>((res) => setTimeout(() => res(fallback), timeoutMs)),
    ]);
  } catch (err) {
    console.warn('[IndexedDB] Operation failed:', err);
    return fallback;
  }
}
