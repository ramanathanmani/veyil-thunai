import { describe, it, expect } from 'vitest';
import { buildHourPlan, buildDayPlan, findCurrentHourPlan, isPeakHeatHour } from './plan';

describe('Hour Plan Generation', () => {
  it('builds an HourPlan with WBGT, band, reasons, and template IDs', () => {
    const plan = buildHourPlan(
      {
        timeISO: '2026-05-10T12:30:00+05:30',
        tempC: 39.0,
        rhPct: 40.0,
        solarWm2: 950.0,
        windSpeed10m: 3.0,
      },
      {
        lat: 12.9675,
        lon: 79.9418,
        workload: 'heavy',
        workerState: 'acclimatised',
        dataQuality: 'forecast',
      }
    );

    expect(plan.wbgtC).toBeGreaterThan(34);
    expect(plan.band).toBe('black'); // WBGT ~35.4 exceeds 30.5 limit for heavy work
    expect(plan.maxWorkMinPerHour).toBeNull();
    expect(plan.reasons).toContain('sun');
    expect(plan.templateIds).toContain('plan.black.now');
    expect(plan.templateIds).toContain('act.stop_work');
    expect(plan.isFallbackSimple).toBe(false);
    expect(plan.calculationMethod).toBe('liljegren');
  });

  it('retains isFallbackSimple and simple_formula_fallback when solar radiation is missing (T-W-04)', () => {
    const plan = buildHourPlan(
      {
        timeISO: '2026-10-27T10:00:00+05:30',
        tempC: 32.0,
        rhPct: 65.0,
        solarWm2: null,
        windSpeed10m: 2.0,
      },
      {
        lat: 12.9675,
        lon: 79.9418,
        workload: 'moderate',
        workerState: 'acclimatised',
      }
    );

    expect(plan.isFallbackSimple).toBe(true);
    expect(plan.calculationMethod).toBe('simple_formula_fallback');
  });

  it('findCurrentHourPlan correctly selects the current IST hour (D-02)', () => {
    const hourlyItems = [
      { timeISO: '2026-10-27T00:00', tempC: 25, rhPct: 80 },
      { timeISO: '2026-10-27T06:00', tempC: 26, rhPct: 80 },
      { timeISO: '2026-10-27T11:00', tempC: 33, rhPct: 60 },
      { timeISO: '2026-10-27T14:00', tempC: 37, rhPct: 45 },
      { timeISO: '2026-10-27T18:00', tempC: 30, rhPct: 70 },
      { timeISO: '2026-10-27T23:00', tempC: 26, rhPct: 85 },
    ];

    const dayPlan = buildDayPlan(hourlyItems, {
      lat: 12.9675,
      lon: 79.9418,
      workload: 'moderate',
      workerState: 'acclimatised',
    });

    // 14:15 IST should match the 14:00 hour plan
    const afternoonIST = new Date('2026-10-27T14:15:00+05:30');
    const matched = findCurrentHourPlan(dayPlan, afternoonIST);
    expect(matched).not.toBeNull();
    expect(matched?.hourISO).toBe('2026-10-27T14:00');
    expect(matched?.tempC).toBe(37);

    // Midnight IST should match 00:00
    const midnightIST = new Date('2026-10-27T00:05:00+05:30');
    const midnightMatch = findCurrentHourPlan(dayPlan, midnightIST);
    expect(midnightMatch?.hourISO).toBe('2026-10-27T00:00');
  });

  it('isPeakHeatHour returns true for 11:00 to 15:59 and false outside', () => {
    expect(isPeakHeatHour('2026-10-27T10:59')).toBe(false);
    expect(isPeakHeatHour('2026-10-27T11:00')).toBe(true);
    expect(isPeakHeatHour('2026-10-27T13:30')).toBe(true);
    expect(isPeakHeatHour('2026-10-27T15:59')).toBe(true);
    expect(isPeakHeatHour('2026-10-27T16:00')).toBe(false);
    expect(isPeakHeatHour('2026-10-27T18:00')).toBe(false);
  });
});
