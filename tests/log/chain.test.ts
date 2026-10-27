import { describe, it, expect } from 'vitest';
import {
  LogEntry,
  canonicalJson,
  computeEntryHash,
  verifyChain,
} from '../../src/log/chain';

describe('T-H-01: Hash Chain Tamper Detection', () => {
  async function createMockChain(count: number = 4): Promise<LogEntry[]> {
    const chain: LogEntry[] = [];
    let prevHash = '';

    for (let i = 0; i < count; i++) {
      const partial: Omit<LogEntry, 'hash'> = {
        id: `entry-${i + 1}`,
        startedAt: `2026-10-27T0${8 + i}:00:00+05:30`,
        endedAt: `2026-10-27T0${9 + i}:00:00+05:30`,
        preset: 'delivery_moto',
        workload: 'light',
        workerState: 'acclimatised',
        placeRounded: { lat: 12.97, lon: 79.94 },
        forecastAtStart: { wbgtC: 28.0 + i, band: 'green', dataQuality: 'forecast' },
        restBreaks: [{ start: `2026-10-27T0${8 + i}:30:00+05:30`, end: `2026-10-27T0${8 + i}:45:00+05:30` }],
        incentivePressure: i % 2 === 0,
        note: `Shift ${i + 1}`,
        prevHash,
      };

      const hash = await computeEntryHash(partial);
      const entry: LogEntry = { ...partial, hash };
      chain.push(entry);
      prevHash = hash;
    }

    return chain;
  }

  it('verifies that an untampered chain returns -1 (intact)', async () => {
    const chain = await createMockChain(5);
    const result = await verifyChain(chain);
    expect(result).toBe(-1);
  });

  it('detects when an internal field is tampered and returns the correct index', async () => {
    const chain = await createMockChain(5);
    // Tamper with index 2
    chain[2].forecastAtStart.wbgtC = 99.9;

    const brokenIndex = await verifyChain(chain);
    expect(brokenIndex).toBe(2);
  });

  it('detects when an entry note or rest break is altered', async () => {
    const chain = await createMockChain(4);
    // Alter note at index 1
    chain[1].note = 'Secretly altered note';

    const brokenIndex = await verifyChain(chain);
    expect(brokenIndex).toBe(1);
  });

  it('detects when an entry is deleted from the middle of the chain', async () => {
    const chain = await createMockChain(5);
    // Remove entry at index 2
    chain.splice(2, 1);

    // Now the former entry 3 (now index 2) has prevHash pointing to deleted entry 2
    const brokenIndex = await verifyChain(chain);
    expect(brokenIndex).toBe(2);
  });

  it('detects when entries are reordered', async () => {
    const chain = await createMockChain(4);
    // Swap index 1 and 2
    const temp = chain[1];
    chain[1] = chain[2];
    chain[2] = temp;

    const brokenIndex = await verifyChain(chain);
    expect(brokenIndex).toBe(1);
  });
});

describe('T-H-02: Canonical JSON Determinism', () => {
  it('same entry with keys in arbitrary order yields identical SHA-256 hash', async () => {
    const obj1 = {
      id: 'uuid-123',
      startedAt: '2026-10-27T10:00:00+05:30',
      endedAt: null,
      preset: 'construction',
      workload: 'heavy',
      workerState: 'new_or_returning',
      placeRounded: { lon: 79.94, lat: 12.97 }, // reordered sub-keys
      forecastAtStart: { dataQuality: 'forecast', wbgtC: 32.5, band: 'red' }, // reordered
      restBreaks: [],
      incentivePressure: true,
      note: 'Dusty and hot',
      prevHash: '',
    };

    const obj2 = {
      prevHash: '',
      note: 'Dusty and hot',
      incentivePressure: true,
      restBreaks: [],
      forecastAtStart: { wbgtC: 32.5, band: 'red', dataQuality: 'forecast' },
      placeRounded: { lat: 12.97, lon: 79.94 },
      workerState: 'new_or_returning',
      workload: 'heavy',
      preset: 'construction',
      endedAt: null,
      startedAt: '2026-10-27T10:00:00+05:30',
      id: 'uuid-123',
    };

    const hash1 = await computeEntryHash(obj1 as any);
    const hash2 = await computeEntryHash(obj2 as any);

    expect(canonicalJson(obj1)).toBe(canonicalJson(obj2));
    expect(hash1).toBe(hash2);
  });
});
