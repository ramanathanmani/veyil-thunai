import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getForecast,
  parseOpenMeteoPayload,
  loadSampleForecast,
} from '../../src/data/forecast';
import {
  saveForecastCache,
  clearMemoryCache,
} from '../../src/data/cache';

describe('T-F-01: Forecast Mocking and Error Resilience', () => {
  beforeEach(() => {
    clearMemoryCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles normal successful Open-Meteo response', async () => {
    const mockPayload = {
      hourly_units: { wind_speed_10m: 'km/h' },
      hourly: {
        time: ['2026-10-27T10:00', '2026-10-27T11:00'],
        temperature_2m: [32.0, 34.0],
        relative_humidity_2m: [65, 60],
        dew_point_2m: [24.0, 24.5],
        wind_speed_10m: [7.2, 10.8],
        shortwave_radiation: [500, 750],
        surface_pressure: [1006.0, 1005.5],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    } as any);

    const res = await getForecast(12.97, 79.94);
    expect(res.dataQuality).toBe('forecast');
    expect(res.staleWarning).toBe(false);
    expect(res.items.length).toBe(2);
    expect(res.items[0].tempC).toBe(32.0);
    // 7.2 km/h / 3.6 = 2.0 m/s
    expect(res.items[0].windSpeed10m).toBeCloseTo(2.0, 1);
    expect(res.items[0].solarWm2).toBe(500);
  });

  it('handles missing radiation values without crashing, marking solar as null', async () => {
    const mockPayload = {
      hourly: {
        time: ['2026-10-27T10:00'],
        temperature_2m: [32.0],
        relative_humidity_2m: [65],
        wind_speed_10m: [2.0],
        shortwave_radiation: [null], // explicit null
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    } as any);

    const res = await getForecast(12.97, 79.94);
    expect(res.dataQuality).toBe('forecast');
    expect(res.items[0].solarWm2).toBeNull();
  });

  it('handles null values in temperature or humidity gracefully with defaults', () => {
    const mockPayload = {
      hourly: {
        time: ['2026-10-27T10:00'],
        temperature_2m: [null],
        relative_humidity_2m: [null],
      },
    };

    const items = parseOpenMeteoPayload(mockPayload);
    expect(items.length).toBe(1);
    expect(items[0].tempC).toBeDefined();
    expect(items[0].rhPct).toBeDefined();
  });

  it('falls back cleanly to sample or cache on malformed JSON payload or fetch throw', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const res = await getForecast(12.97, 79.94);
    // With empty cache, falls back to sample
    expect(res.dataQuality).toBe('sample');
    expect(res.items.length).toBeGreaterThan(0);
  });
});

describe('T-F-02: Cache Staleness and Fallback Hierarchy', () => {
  beforeEach(() => {
    clearMemoryCache();
    vi.restoreAllMocks();
  });

  it('shows fresh cached forecast when cache is under 6 hours old', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const now = new Date('2026-10-27T14:00:00Z');
    const cachedTime = new Date('2026-10-27T11:00:00Z'); // 3 hours old

    await saveForecastCache({
      lat: 12.97,
      lon: 79.94,
      fetchedAt: cachedTime.toISOString(),
      items: [
        {
          timeISO: '2026-10-27T11:00',
          tempC: 33.0,
          rhPct: 60,
          solarWm2: 600,
          windSpeed10m: 2.0,
        },
      ],
    });

    const res = await getForecast(12.97, 79.94, now);
    expect(res.dataQuality).toBe('forecast');
    expect(res.staleWarning).toBe(false);
    expect(res.ageHours).toBeCloseTo(3.0, 1);
    expect(res.ageFormatted).toContain('3 h ago');
  });

  it('shows stale warning when cache is between 6 and 24 hours old', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const now = new Date('2026-10-27T18:00:00Z');
    const cachedTime = new Date('2026-10-27T10:00:00Z'); // 8 hours old

    await saveForecastCache({
      lat: 12.97,
      lon: 79.94,
      fetchedAt: cachedTime.toISOString(),
      items: [
        {
          timeISO: '2026-10-27T10:00',
          tempC: 31.0,
          rhPct: 65,
          solarWm2: 500,
          windSpeed10m: 2.0,
        },
      ],
    });

    const res = await getForecast(12.97, 79.94, now);
    expect(res.dataQuality).toBe('cached_stale');
    expect(res.staleWarning).toBe(true);
    expect(res.ageHours).toBeCloseTo(8.0, 1);
    expect(res.ageFormatted).toContain('8 h ago');
  });

  it('falls back to sample data when cache is older than 24 hours', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const now = new Date('2026-10-28T15:00:00Z');
    const cachedTime = new Date('2026-10-27T10:00:00Z'); // 29 hours old

    await saveForecastCache({
      lat: 12.97,
      lon: 79.94,
      fetchedAt: cachedTime.toISOString(),
      items: [
        {
          timeISO: '2026-10-27T10:00',
          tempC: 31.0,
          rhPct: 65,
          solarWm2: 500,
          windSpeed10m: 2.0,
        },
      ],
    });

    const res = await getForecast(12.97, 79.94, now);
    expect(res.dataQuality).toBe('sample');
    expect(res.sourceLabel).toContain('Sample');
  });
});
