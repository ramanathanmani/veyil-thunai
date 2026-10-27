import { describe, it, expect } from 'vitest';
import { calculateWBGT, computeWbgtSimpleFallback, WIND_10M_TO_2M_DEFAULT } from './wbgt';
import { calculateSolarParameters } from './solar';
import constantsData from '../../config/constants.json';

describe('WBGT config and wind sensitivity (T-L-03 / Sec 6.1)', () => {
  it('loads WIND_10M_TO_2M from config', () => {
    expect(WIND_10M_TO_2M_DEFAULT).toBe(constantsData.constants.WIND_10M_TO_2M.value);
    expect(WIND_10M_TO_2M_DEFAULT).toBe(0.6);
  });

  it('verifies 2m wind sensitivity when overriding wind conversion factor', () => {
    const base = calculateWBGT({
      date: '2026-10-27T12:00:00+05:30',
      lat: 12.9675,
      lon: 79.9418,
      tempC: 35.0,
      rhPct: 50.0,
      solarWm2: 800.0,
      windSpeed10m: 4.0,
    });

    const higherWind = calculateWBGT({
      date: '2026-10-27T12:00:00+05:30',
      lat: 12.9675,
      lon: 79.9418,
      tempC: 35.0,
      rhPct: 50.0,
      solarWm2: 800.0,
      windSpeed10m: 4.0,
      wind10mTo2mFactor: 0.8, // 4 * 0.8 = 3.2 m/s vs 4 * 0.6 = 2.4 m/s
    });

    expect(base.wind2mMs).toBe(2.4);
    expect(higherWind.wind2mMs).toBe(3.2);
    // Higher wind provides increased evaporative and convective cooling -> lower or equal WBGT
    expect(higherWind.wbgtC).toBeLessThanOrEqual(base.wbgtC);
  });
});

describe('Solar position and irradiance calculations', () => {
  it('calculates daytime solar parameters in Sriperumbudur', () => {
    // 27 Oct 2026, 09:30 IST (+05:30) = 04:00 UTC
    const date = new Date('2026-10-27T09:30:00+05:30');
    const params = calculateSolarParameters(date, 12.9675, 79.9418, 520);

    expect(params.cza).toBeGreaterThan(0.6);
    expect(params.apparentZenithDeg).toBeLessThan(50);
    expect(params.solarAdj).toBeGreaterThan(400);
    expect(params.fdir).toBeGreaterThan(0);
  });

  it('sets solar and fdir to zero when inShade is true', () => {
    const date = new Date('2026-05-10T12:30:00+05:30');
    const params = calculateSolarParameters(date, 12.9675, 79.9418, 950, true);

    expect(params.solarAdj).toBe(0);
    expect(params.fdir).toBe(0);
  });

  it('sets solar and fdir to zero at night (sun below horizon)', () => {
    const date = new Date('2026-10-27T22:00:00+05:30');
    const params = calculateSolarParameters(date, 12.9675, 79.9418, 100);

    expect(params.cza).toBeLessThan(0);
    expect(params.solarAdj).toBe(0);
    expect(params.fdir).toBe(0);
  });
});

describe('WBGT engine - Liljegren implementation', () => {
  it('computes WBGT for typical hot midday condition', () => {
    const res = calculateWBGT({
      date: '2026-05-10T12:30:00+05:30',
      lat: 12.9675,
      lon: 79.9418,
      tempC: 39.0,
      rhPct: 40.0,
      solarWm2: 950.0,
      windSpeed10m: 3.0,
    });

    expect(res.calculationMethod).toBe('liljegren');
    expect(res.isFallbackSimple).toBe(false);
    expect(res.wbgtC).toBeGreaterThan(34.0);
    expect(res.wbgtC).toBeLessThan(37.0);
    expect(res.globeC).toBeGreaterThan(res.wbgtC);
  });

  it('safely falls back to simple formula when solar is null', () => {
    const res = calculateWBGT({
      date: '2026-10-27T10:00:00+05:30',
      lat: 12.9675,
      lon: 79.9418,
      tempC: 30.0,
      rhPct: 70.0,
      solarWm2: null,
    });

    expect(res.isFallbackSimple).toBe(true);
    expect(res.calculationMethod).toBe('simple_formula_fallback');
    expect(res.wbgtC).toBeCloseTo(computeWbgtSimpleFallback(30, 70), 0);
  });
});
