import { describe, it, expect } from 'vitest';
import { lookupLimitAndBand, checkConfigIntegrity } from './limits';

describe('Limits and Band Lookups', () => {
  it('assigns green band when WBGT is <= first threshold', () => {
    // Light, acclimatised: limit for 75-100% is 31.0
    const res = lookupLimitAndBand(30.5, 'light', 'acclimatised');
    expect(res.band).toBe('green');
    expect(res.maxWorkMinPerHour).toBe(60);
    expect(res.minRestMinPerHour).toBe(0);
  });

  it('assigns black band when WBGT exceeds all limits', () => {
    // Heavy, acclimatised: limit for 0-25% is 30.5
    const res = lookupLimitAndBand(32.0, 'heavy', 'acclimatised');
    expect(res.band).toBe('black');
    expect(res.maxWorkMinPerHour).toBeNull();
    expect(res.minRestMinPerHour).toBeNull();
  });

  it('verifies config integrity check returns flags', () => {
    const { unverified, assumed } = checkConfigIntegrity();
    expect(unverified.length).toBeGreaterThan(0);
    expect(assumed.length).toBeGreaterThan(0);
  });
});
