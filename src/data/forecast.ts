/**
 * Open-Meteo Forecast client with IndexedDB caching and offline fallback.
 *
 * Implements Section 5 and rules T-F-01 and T-F-02:
 * - Live fetch from Open-Meteo API
 * - 6-hour staleness warning
 * - 24-hour fallback to sample-forecast.json
 * - Robust parsing for missing, null, or corrupted fields
 */

import sampleData from './sample-forecast.json';
import { HourlyForecastItem, DataQuality } from '../engine/plan';
import {
  CachedForecast,
  saveForecastCache,
  getForecastCache,
} from './cache';

export interface ForecastResponse {
  items: HourlyForecastItem[];
  dataQuality: DataQuality;
  fetchedAt: string; // ISO string
  ageHours: number;
  staleWarning: boolean;
  ageFormatted: string;
  sourceLabel: string;
}

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const STALE_HOURS = 6;
const FALLBACK_HOURS = 24;

/**
 * Formats data age in human-readable plain language.
 */
export function formatDataAge(ageHours: number): string {
  if (ageHours < 0.1) return 'just now';
  if (ageHours < 1.0) {
    const mins = Math.round(ageHours * 60);
    return `updated ${mins} min ago`;
  }
  const h = Math.floor(ageHours);
  return `updated ${h} h ago`;
}

/**
 * Parses raw Open-Meteo JSON into structured HourlyForecastItem array.
 * Tolerates nulls, missing radiation, and malformed arrays safely.
 */
export function parseOpenMeteoPayload(payload: any): HourlyForecastItem[] {
  if (!payload || !payload.hourly || !Array.isArray(payload.hourly.time)) {
    throw new Error('Malformed forecast payload: hourly.time array missing');
  }

  const h = payload.hourly;
  const times: string[] = h.time;
  const items: HourlyForecastItem[] = [];

  for (let i = 0; i < times.length; i++) {
    const rawTime = times[i];
    // Open-Meteo returns timestamps like "2026-10-27T13:00" for Asia/Kolkata.
    // Ensure all timestamps have explicit "+05:30" offset if missing,
    // so solar calculation and date parsing is identical worldwide regardless of device timezone.
    const timeISO =
      rawTime.includes('+') || rawTime.endsWith('Z')
        ? rawTime
        : `${rawTime}+05:30`;
    const tempC = h.temperature_2m && h.temperature_2m[i] !== null ? Number(h.temperature_2m[i]) : 30.0;
    const rhPct = h.relative_humidity_2m && h.relative_humidity_2m[i] !== null ? Number(h.relative_humidity_2m[i]) : 50.0;
    const dewPointC = h.dew_point_2m && h.dew_point_2m[i] !== null ? Number(h.dew_point_2m[i]) : undefined;
    
    // In Open-Meteo, wind_speed_10m is returned in km/h by default unless windspeed_unit=ms is passed.
    // We convert km/h to m/s: 1 km/h = 1/3.6 m/s
    const rawWind = h.wind_speed_10m && h.wind_speed_10m[i] !== null ? Number(h.wind_speed_10m[i]) : 7.2;
    const isKmH = payload.hourly_units?.wind_speed_10m === 'km/h';
    const windSpeed10m = isKmH ? rawWind / 3.6 : rawWind;

    // Shortwave solar radiation in W/m^2 (null if missing to trigger fallback)
    const rawSolar = h.shortwave_radiation ? h.shortwave_radiation[i] : null;
    const solarWm2 = rawSolar !== null && rawSolar !== undefined && !isNaN(Number(rawSolar)) ? Number(rawSolar) : null;

    const pressureHpa = h.surface_pressure && h.surface_pressure[i] !== null ? Number(h.surface_pressure[i]) : 1005.0;

    items.push({
      timeISO,
      tempC,
      rhPct,
      dewPointC,
      windSpeed10m,
      solarWm2,
      pressureHpa,
    });
  }

  return items;
}

/**
 * Loads the built-in sample forecast data.
 */
export function loadSampleForecast(now: Date = new Date()): ForecastResponse {
  const items = parseOpenMeteoPayload(sampleData);
  return {
    items,
    dataQuality: 'sample',
    fetchedAt: now.toISOString(),
    ageHours: 0,
    staleWarning: false,
    ageFormatted: 'sample data (offline)',
    sourceLabel: 'Sample Data',
  };
}

/**
 * Fetches 48-hour hourly weather forecast for the specified coordinates.
 * Manages caching, staleness labels, and fallback transitions.
 *
 * @param lat - Latitude (will be rounded to 2 decimals)
 * @param lon - Longitude (will be rounded to 2 decimals)
 * @param now - Reference date for staleness evaluation (defaults to current time)
 */
export async function getForecast(
  lat: number,
  lon: number,
  now: Date = new Date()
): Promise<ForecastResponse> {
  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;

  let cached = await getForecastCache();

  try {
    const url = `${OPEN_METEO_BASE}?latitude=${rLat}&longitude=${rLon}&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,wind_speed_10m,shortwave_radiation,direct_radiation,diffuse_radiation,surface_pressure&timezone=Asia%2FKolkata&forecast_days=2`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP error: status ${res.status}`);
    }

    const payload = await res.json();
    const items = parseOpenMeteoPayload(payload);
    const fetchedAt = now.toISOString();

    // Cache the fresh result
    const newCache: CachedForecast = {
      lat: rLat,
      lon: rLon,
      fetchedAt,
      items,
    };
    await saveForecastCache(newCache);

    return {
      items,
      dataQuality: 'forecast',
      fetchedAt,
      ageHours: 0,
      staleWarning: false,
      ageFormatted: 'just now',
      sourceLabel: 'Live Forecast (Open-Meteo)',
    };
  } catch (err) {
    console.warn('Network forecast fetch failed or offline:', err);

    // Fallback to cache if available
    if (cached && cached.items && cached.items.length > 0) {
      const cachedTime = new Date(cached.fetchedAt).getTime();
      const ageHours = Math.max(0, (now.getTime() - cachedTime) / (1000 * 60 * 60));

      if (ageHours < FALLBACK_HOURS) {
        const isStale = ageHours >= STALE_HOURS;
        return {
          items: cached.items,
          dataQuality: isStale ? 'cached_stale' : 'forecast',
          fetchedAt: cached.fetchedAt,
          ageHours,
          staleWarning: isStale,
          ageFormatted: formatDataAge(ageHours),
          sourceLabel: isStale ? 'Cached (Stale > 6h)' : 'Cached Forecast',
        };
      }
    }

    // Over 24h stale or no cache -> Fallback to sample data
    return loadSampleForecast(now);
  }
}
