import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import fs from 'fs';
import path from 'path';
import { getForecast, loadSampleForecast } from '../../src/data/forecast';
import { saveSettings, getSettings, saveForecastCache, getForecastCache } from '../../src/data/cache';
import { buildDayPlan, findCurrentHourPlan } from '../../src/engine/plan';
import { startShift, recordRestBreak, endShift, getAllLogEntries } from '../../src/log/store';
import { verifyChain } from '../../src/log/chain';

describe('T-E-01: End-to-End Online Flow (S1 -> S2 -> S3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('completes onboarding setup and transitions to S2 Today and S3 Timeline with real forecast', async () => {
    // 1. S1 Onboarding configuration
    await saveSettings({
      language: 'ta',
      presetId: 'delivery_moto',
      workload: 'moderate',
      workerState: 'acclimatised',
      locationId: 'chennai',
      lat: 13.0827,
      lon: 80.2707,
    });

    const settings = await getSettings();
    expect(settings.language).toBe('ta');
    expect(settings.presetId).toBe('delivery_moto');
    expect(settings.workload).toBe('moderate');

    // 2. Fetch forecast data (mocked Open-Meteo response)
    const mockApiResponse = {
      latitude: 13.08,
      longitude: 80.27,
      utc_offset_seconds: 19800,
      timezone: 'Asia/Kolkata',
      hourly: {
        time: [
          '2026-10-27T00:00', '2026-10-27T06:00', '2026-10-27T12:00',
          '2026-10-27T14:00', '2026-10-27T18:00', '2026-10-27T22:00',
        ],
        temperature_2m: [25.0, 27.0, 36.0, 38.0, 31.0, 26.0],
        relative_humidity_2m: [85, 80, 50, 45, 65, 80],
        dew_point_2m: [22.0, 23.0, 24.0, 24.5, 23.5, 22.0],
        cloud_cover: [10, 20, 10, 5, 15, 20],
        wind_speed_10m: [5.0, 6.0, 12.0, 14.0, 8.0, 5.0],
        shortwave_radiation: [0, 150, 880, 750, 50, 0],
        surface_pressure: [1010, 1009, 1006, 1005, 1007, 1009],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as any);

    const forecast = await getForecast(settings.lat, settings.lon);
    expect(forecast.dataQuality).toBe('forecast');
    expect(forecast.items.length).toBe(6);

    // 3. S2 Today: build plan and match current hour
    const dayPlan = buildDayPlan(forecast.items, {
      lat: settings.lat,
      lon: settings.lon,
      workload: settings.workload,
      workerState: settings.workerState,
    });
    expect(dayPlan.length).toBe(6);

    const middayTestTime = new Date('2026-10-27T14:10:00+05:30');
    const currentHourPlan = findCurrentHourPlan(dayPlan, middayTestTime);
    expect(currentHourPlan).not.toBeNull();
    expect(currentHourPlan?.hourISO).toMatch(/^2026-10-27T14:00/);
    // 38°C at 45% RH with 750 W/m2 radiation yields severe/extreme heat
    expect(['orange', 'red', 'black']).toContain(currentHourPlan?.band);

    // 4. S3 Day Plan: verify 24h timeline and work-rest breakdown
    for (const plan of dayPlan) {
      expect(plan.hourISO).toBeDefined();
      expect(plan.wbgtC).toBeGreaterThan(0);
      expect(['green', 'yellow', 'orange', 'red', 'black']).toContain(plan.band);
      if (plan.band === 'green') {
        expect(plan.maxWorkMinPerHour).toBeGreaterThanOrEqual(45);
      }
    }
  });
});

describe('T-E-02: End-to-End Offline Flow and Tamper-Evident Shift Logging', () => {
  it('renders offline with cached forecast and performs tamper-evident shift logging (S4 -> S5)', async () => {
    // 1. Simulate saving cached forecast (e.g. 7 hours ago to trigger stale cache)
    const sevenHoursAgo = new Date(Date.now() - 7 * 3600 * 1000).toISOString();
    const sample = loadSampleForecast();
    await saveForecastCache({
      lat: 13.08,
      lon: 80.27,
      fetchedAt: sevenHoursAgo,
      items: sample.items,
    });

    // Simulate network offline failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    // Should seamlessly fall back to cached forecast and flag as cached_stale
    const offlineForecast = await getForecast(13.08, 80.27);
    expect(offlineForecast.dataQuality).toBe('cached_stale');
    expect(offlineForecast.staleWarning).toBe(true);
    expect(offlineForecast.ageFormatted).toContain('ago');

    // 2. Start work shift on S4
    const shift = await startShift({
      preset: 'delivery_cycle',
      workload: 'heavy',
      workerState: 'new_or_returning',
      lat: 13.08,
      lon: 80.27,
      wbgtC: 32.5,
      band: 'orange',
      dataQuality: 'cached_stale',
    });

    expect(shift.id).toBeDefined();
    expect(shift.hash).toBeDefined();
    expect(shift.workload).toBe('heavy');

    // 3. Record rest break during shift
    const now = new Date();
    const breakStart = new Date(now.getTime() - 15 * 60 * 1000);
    const updatedShift = await recordRestBreak(shift.id, breakStart, now);
    expect(updatedShift.restBreaks.length).toBe(1);

    // 4. End work shift with employer pressure answer
    await endShift({
      shiftId: shift.id,
      endedAt: new Date(),
      incentivePressure: true,
      note: 'Took 15 min rest under bus shelter due to heavy sun.',
    });

    // 5. Verify tamper-evident log in S5 History
    const entries = await getAllLogEntries();
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const latest = entries[entries.length - 1];
    expect(latest.incentivePressure).toBe(true);
    expect(latest.note).toContain('bus shelter');

    const brokenIndex = await verifyChain(entries);
    expect(brokenIndex).toBe(-1); // -1 indicates full chain intact
  });
});

describe('T-E-03: Network Policy Enforcement (§2.5 / §13.1)', () => {
  it('strictly ensures only https://api.open-meteo.com is contacted across runtime and code', () => {
    const srcDir = path.resolve('src');
    const allowedHosts = ['api.open-meteo.com'];

    // Scan all code files in src/
    const scanFiles = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanFiles(full);
        } else if (/\.(ts|tsx|js|html)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');

          // Find all http/https URL occurrences
          const urlMatches = content.match(/https?:\/\/[a-zA-Z0-9.-]+/g) || [];
          for (const url of urlMatches) {
            const host = url.replace(/^https?:\/\//, '');
            // Allowed: open-meteo, localhost, schema.org / w3c standards namespaces
            const isAllowed =
              allowedHosts.some((h) => host.includes(h)) ||
              host.includes('localhost') ||
              host.includes('w3.org') ||
              host.includes('schema.org');

            expect(
              isAllowed,
              `Disallowed external network host "${host}" found in ${entry.name} violating §2.5 local-first policy!`
            ).toBe(true);
          }
        }
      }
    };

    scanFiles(srcDir);

    // Also check index.html for CSP and external script tags
    const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
    expect(indexHtml).toContain('Content-Security-Policy');
    expect(indexHtml).toContain("connect-src 'self' https://api.open-meteo.com");
    expect(indexHtml).not.toContain('google-analytics.com');
    expect(indexHtml).not.toContain('doubleclick.net');
    expect(indexHtml).not.toContain('fonts.googleapis.com');
  });
});
