/**
 * IndexedDB storage client for forecast caching and worker settings.
 *
 * Uses `idb` in browser environments with automatic in-memory fallback
 * for headless Node.js test execution.
 */

import { openDB, IDBPDatabase } from 'idb';
import { HourlyForecastItem } from '../engine/plan';

export interface CachedForecast {
  lat: number;
  lon: number;
  fetchedAt: string; // ISO string
  items: HourlyForecastItem[];
}

export interface AppSettings {
  language: 'ta' | 'hi' | 'en';
  presetId: string;
  workload: 'light' | 'moderate' | 'heavy' | 'very_heavy';
  workerState: 'acclimatised' | 'new_or_returning';
  highContrast: boolean;
  textSize: 'normal' | 'large' | 'extra_large';
  locationId: string;
  lat: number;
  lon: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'ta',
  presetId: 'delivery_moto',
  workload: 'light',
  workerState: 'acclimatised',
  highContrast: false,
  textSize: 'normal',
  locationId: 'sriperumbudur',
  lat: 12.97,
  lon: 79.94,
};

const DB_NAME = 'veyil_thunai_db';
const DB_VERSION = 1;
const STORE_FORECAST = 'forecast_cache';
const STORE_SETTINGS = 'settings';

// In-memory fallback map for Node tests
const memoryStore: Record<string, any> = {};

let dbPromise: Promise<IDBPDatabase> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_FORECAST)) {
          db.createObjectStore(STORE_FORECAST);
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Saves forecast to IndexedDB cache with timestamp.
 */
export async function saveForecastCache(forecast: CachedForecast): Promise<void> {
  if (!isIndexedDbAvailable()) {
    memoryStore['last_forecast'] = forecast;
    return;
  }
  try {
    const db = await getDB();
    await db.put(STORE_FORECAST, forecast, 'last_forecast');
  } catch (err) {
    console.warn('Failed to save forecast to IndexedDB:', err);
    memoryStore['last_forecast'] = forecast;
  }
}

/**
 * Retrieves the last cached forecast from IndexedDB.
 */
export async function getForecastCache(): Promise<CachedForecast | null> {
  if (!isIndexedDbAvailable()) {
    return memoryStore['last_forecast'] || null;
  }
  try {
    const db = await getDB();
    const cached = await db.get(STORE_FORECAST, 'last_forecast');
    return cached || null;
  } catch (err) {
    console.warn('Failed to read forecast from IndexedDB:', err);
    return memoryStore['last_forecast'] || null;
  }
}

/**
 * Saves user settings.
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = { ...current, ...settings };

  if (!isIndexedDbAvailable()) {
    memoryStore['app_settings'] = updated;
    return updated;
  }
  try {
    const db = await getDB();
    await db.put(STORE_SETTINGS, updated, 'app_settings');
  } catch (err) {
    console.warn('Failed to save settings to IndexedDB:', err);
    memoryStore['app_settings'] = updated;
  }
  return updated;
}

/**
 * Retrieves saved settings or defaults.
 */
export async function getSettings(): Promise<AppSettings> {
  if (!isIndexedDbAvailable()) {
    return memoryStore['app_settings'] || { ...DEFAULT_SETTINGS };
  }
  try {
    const db = await getDB();
    const stored = await db.get(STORE_SETTINGS, 'app_settings');
    return stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
  } catch (err) {
    console.warn('Failed to read settings from IndexedDB:', err);
    return memoryStore['app_settings'] || { ...DEFAULT_SETTINGS };
  }
}

/**
 * Clears in-memory store (used for test isolation).
 */
export function clearMemoryCache(): void {
  for (const k of Object.keys(memoryStore)) {
    delete memoryStore[k];
  }
}
