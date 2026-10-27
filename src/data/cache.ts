/**
 * IndexedDB storage client for forecast caching and worker settings.
 *
 * Uses `idb` in browser environments with automatic in-memory fallback
 * for headless Node.js test execution.
 */

import { HourlyForecastItem } from '../engine/plan';
import {
  withDbTimeout,
  STORE_FORECAST,
  STORE_SETTINGS,
} from './db';

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

// In-memory fallback map for Node tests & timeout fallback
const memoryStore: Record<string, any> = {};

/**
 * Saves forecast to IndexedDB cache with timestamp.
 * Keys both by exact coordinates and 'last_forecast' for fallback parity.
 */
export async function saveForecastCache(forecast: CachedForecast): Promise<void> {
  const coordKey = `forecast_${forecast.lat.toFixed(2)}_${forecast.lon.toFixed(2)}`;
  memoryStore[coordKey] = forecast;
  memoryStore['last_forecast'] = forecast;

  await withDbTimeout(
    async (db) => {
      await db.put(STORE_FORECAST, forecast, coordKey);
      await db.put(STORE_FORECAST, forecast, 'last_forecast');
    },
    undefined,
    1500
  );
}

/**
 * Retrieves the cached forecast from IndexedDB.
 * Checks coordinate-specific cache first if coordinates provided, falling back to last_forecast.
 */
export async function getForecastCache(lat?: number, lon?: number): Promise<CachedForecast | null> {
  const coordKey =
    lat !== undefined && lon !== undefined
      ? `forecast_${lat.toFixed(2)}_${lon.toFixed(2)}`
      : 'last_forecast';
  const fallback = memoryStore[coordKey] || memoryStore['last_forecast'] || null;

  return withDbTimeout(
    async (db) => {
      if (lat !== undefined && lon !== undefined) {
        const byCoord = await db.get(STORE_FORECAST, coordKey);
        if (byCoord) return byCoord;
      }
      const cached = await db.get(STORE_FORECAST, 'last_forecast');
      return cached || fallback;
    },
    fallback,
    1500
  );
}

/**
 * Saves user settings.
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = { ...current, ...settings };
  memoryStore['app_settings'] = updated;

  await withDbTimeout(
    async (db) => {
      await db.put(STORE_SETTINGS, updated, 'app_settings');
    },
    undefined,
    1500
  );

  return updated;
}

/**
 * Retrieves saved settings or defaults.
 */
export async function getSettings(): Promise<AppSettings> {
  const fallback = memoryStore['app_settings'] || { ...DEFAULT_SETTINGS };
  return withDbTimeout(
    async (db) => {
      const stored = await db.get(STORE_SETTINGS, 'app_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...stored } : fallback;
    },
    fallback,
    1500
  );
}

/**
 * Clears in-memory store (used for test isolation).
 */
export function clearMemoryCache(): void {
  for (const k of Object.keys(memoryStore)) {
    delete memoryStore[k];
  }
}
