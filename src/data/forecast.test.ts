import { describe, it, expect } from 'vitest';
import {
  parseOpenMeteoPayload,
  loadSampleForecast,
  formatDataAge,
} from './forecast';

describe('Forecast Data Parsing & Formatting', () => {
  it('formats data age accurately', () => {
    expect(formatDataAge(0.05)).toBe('just now');
    expect(formatDataAge(0.5)).toBe('updated 30 min ago');
    expect(formatDataAge(3.2)).toBe('updated 3 h ago');
  });

  it('loads sample forecast with offline label', () => {
    const sample = loadSampleForecast();
    expect(sample.dataQuality).toBe('sample');
    expect(sample.items.length).toBe(24);
    expect(sample.items[12].tempC).toBe(36.8);
  });

  it('safely parses payload with missing shortwave radiation', () => {
    const payload = {
      hourly: {
        time: ['2026-10-27T12:00'],
        temperature_2m: [35.0],
        relative_humidity_2m: [50],
        wind_speed_10m: [10],
      },
    };
    const items = parseOpenMeteoPayload(payload);
    expect(items.length).toBe(1);
    expect(items[0].solarWm2).toBeNull();
  });
});
