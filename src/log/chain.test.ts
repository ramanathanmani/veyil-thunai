import { describe, it, expect } from 'vitest';
import {
  canonicalJson,
  computeEntryHash,
  LogEntry,
} from './chain';

describe('Hash Chain & Canonical JSON', () => {
  it('formats canonical JSON deterministically regardless of key order', () => {
    const objA = { b: 2, a: 1, c: { z: 26, y: 25 } };
    const objB = { a: 1, c: { y: 25, z: 26 }, b: 2 };

    expect(canonicalJson(objA)).toBe(canonicalJson(objB));
    expect(canonicalJson(objA)).toBe('{"a":1,"b":2,"c":{"y":25,"z":26}}');
  });

  it('computes 64-character SHA-256 hex string for an entry', async () => {
    const entry: Omit<LogEntry, 'hash'> = {
      id: 'test-1',
      startedAt: '2026-10-27T10:00:00+05:30',
      endedAt: null,
      preset: 'delivery_moto',
      workload: 'light',
      workerState: 'acclimatised',
      placeRounded: { lat: 12.97, lon: 79.94 },
      forecastAtStart: { wbgtC: 30.5, band: 'green', dataQuality: 'forecast' },
      restBreaks: [],
      incentivePressure: null,
      note: 'Normal day',
      prevHash: '',
    };

    const hash = await computeEntryHash(entry);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });
});
