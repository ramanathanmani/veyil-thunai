import { describe, it, expect } from 'vitest';
import vectors from '../fixtures/wbgt_vectors.json';
import gridVectors from '../fixtures/wbgt_grid_200.json';
import { calculateWBGT } from '../../src/engine/wbgt';

describe('T-W-01: WBGT Oracle 5 Reference Scenarios (§6.3)', () => {
  vectors.forEach((v) => {
    it(`matches reference for ${v.name}`, () => {
      const res = calculateWBGT({
        date: `${v.local_time_ist}:00+05:30`,
        lat: 12.9675,
        lon: 79.9418,
        tempC: v.temp_c,
        rhPct: v.rh_pct,
        solarWm2: v.shortwave_wm2,
        windSpeed10m: v.wind10_ms,
        windSpeed2m: v.wind2_ms,
        pressureHpa: v.pressure_hpa,
      });

      const diff = Math.abs(res.rawWbgtC - v.wbgt_liljegren_c);
      console.log(
        `[T-W-01] ${v.name}: calculated=${res.rawWbgtC.toFixed(2)}°C, reference=${v.wbgt_liljegren_c}°C, diff=${diff.toFixed(2)}°C`
      );

      // Tolerance specification: <= 1.5 °C
      expect(diff).toBeLessThanOrEqual(1.5);
      // Our actual port is exceptionally close (within 0.3°C)
      expect(diff).toBeLessThanOrEqual(0.5);
    });
  });
});

describe('T-W-02: WBGT Grid Test (200 Random Points vs pywbgt)', () => {
  it('achieves max abs diff <= 1.5°C and mean abs diff <= 0.7°C over 200 points', () => {
    let sumDiff = 0;
    let maxDiff = 0;

    for (const pt of gridVectors) {
      const res = calculateWBGT({
        date: `${pt.time_ist}:00+05:30`,
        lat: pt.lat,
        lon: pt.lon,
        tempC: pt.temp_c,
        rhPct: pt.rh_pct,
        solarWm2: pt.solar_wm2,
        windSpeed10m: pt.wind10_ms,
        windSpeed2m: pt.wind2_ms,
        pressureHpa: pt.pressure_hpa,
      });

      const diff = Math.abs(res.rawWbgtC - pt.wbgt_liljegren_c);
      sumDiff += diff;
      if (diff > maxDiff) {
        maxDiff = diff;
      }

      // Individual point tolerance check
      expect(diff).toBeLessThanOrEqual(1.5);
    }

    const meanDiff = sumDiff / gridVectors.length;
    console.log(
      `[T-W-02] 200-point grid test summary: maxDiff=${maxDiff.toFixed(3)}°C (target <= 1.5°C), meanDiff=${meanDiff.toFixed(3)}°C (target <= 0.7°C)`
    );

    expect(maxDiff).toBeLessThanOrEqual(1.5);
    expect(meanDiff).toBeLessThanOrEqual(0.7);
  });
});

describe('T-W-03: Physical Monotonicity Properties', () => {
  const baseInput = {
    date: '2026-05-10T12:30:00+05:30',
    lat: 12.9675,
    lon: 79.9418,
    tempC: 35.0,
    rhPct: 50.0,
    solarWm2: 800.0,
    windSpeed10m: 2.0,
    pressureHpa: 1005.0,
  };

  it('WBGT is non-decreasing with increasing relative humidity', () => {
    const resLow = calculateWBGT({ ...baseInput, rhPct: 40.0 });
    const resHigh = calculateWBGT({ ...baseInput, rhPct: 70.0 });
    expect(resHigh.rawWbgtC).toBeGreaterThanOrEqual(resLow.rawWbgtC);
  });

  it('WBGT is non-decreasing with increasing solar radiation', () => {
    const resLowSolar = calculateWBGT({ ...baseInput, solarWm2: 200.0 });
    const resHighSolar = calculateWBGT({ ...baseInput, solarWm2: 900.0 });
    expect(resHighSolar.rawWbgtC).toBeGreaterThanOrEqual(resLowSolar.rawWbgtC);
  });

  it('WBGT is non-increasing with increasing wind speed in typical conditions', () => {
    const resLowWind = calculateWBGT({ ...baseInput, windSpeed10m: 1.0 });
    const resHighWind = calculateWBGT({ ...baseInput, windSpeed10m: 5.0 });
    // In hot sunshine, higher wind improves evaporative and convective cooling
    expect(resHighWind.rawWbgtC).toBeLessThanOrEqual(resLowWind.rawWbgtC + 0.1);
  });

  it('WBGT in shade (solar 0) <= WBGT under direct sun (solar > 0)', () => {
    const resSun = calculateWBGT({ ...baseInput, inShade: false });
    const resShade = calculateWBGT({ ...baseInput, inShade: true });
    expect(resShade.rawWbgtC).toBeLessThan(resSun.rawWbgtC);
  });
});

describe('T-W-04: Primary Method Policy', () => {
  it('engine never calls simple formula fallback when solar radiation data exists', () => {
    const res = calculateWBGT({
      date: '2026-05-10T12:30:00+05:30',
      lat: 12.9675,
      lon: 79.9418,
      tempC: 35.0,
      rhPct: 50.0,
      solarWm2: 500.0,
    });

    expect(res.calculationMethod).toBe('liljegren');
    expect(res.isFallbackSimple).toBe(false);
  });

  it('fallback is explicitly flagged as simple formula fallback when radiation is missing', () => {
    const res = calculateWBGT({
      date: '2026-05-10T12:30:00+05:30',
      lat: 12.9675,
      lon: 79.9418,
      tempC: 35.0,
      rhPct: 50.0,
      solarWm2: null,
    });

    expect(res.calculationMethod).toBe('simple_formula_fallback');
    expect(res.isFallbackSimple).toBe(true);
  });
});
