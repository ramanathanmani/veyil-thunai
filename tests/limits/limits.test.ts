import { describe, it, expect } from 'vitest';
import thresholdsData from '../../config/thresholds.json';
import {
  lookupLimitAndBand,
  checkConfigIntegrity,
  WorkloadClass,
  WorkerState,
  Band,
} from '../../src/engine/limits';

describe('T-L-01: Limits Boundary Precision (Every cell as a boundary)', () => {
  const workloads: WorkloadClass[] = ['light', 'moderate', 'heavy', 'very_heavy'];
  const states: WorkerState[] = ['acclimatised', 'new_or_returning'];
  const expectedBands: Band[] = ['green', 'yellow', 'orange', 'red', 'black'];

  states.forEach((state) => {
    const table =
      state === 'acclimatised'
        ? thresholdsData.acclimatised_tlv
        : thresholdsData.new_or_returning_action_limit;

    workloads.forEach((workload) => {
      const limits = table[workload]; // 4 thresholds

      limits.forEach((limit, rowIndex) => {
        // In acclimatised_tlv light, row 0 and row 1 both have limit 31.0.
        // Under the rule "pick the most work whose limit >= WBGT", 31.0 picks row 0 (green)
        // and 31.01 exceeds both row 0 and row 1, moving directly to row 2 (orange).
        if (rowIndex > 0 && limit === limits[rowIndex - 1]) {
          // Duplicate threshold cell - covered by previous row
          return;
        }

        const isDuplicateNext = rowIndex + 1 < limits.length && limit === limits[rowIndex + 1];
        const nextExpectedBand = isDuplicateNext ? expectedBands[rowIndex + 2] : expectedBands[rowIndex + 1];

        it(`${state} - ${workload}: WBGT equal to limit ${limit}°C stays in row ${rowIndex} (${expectedBands[rowIndex]})`, () => {
          const res = lookupLimitAndBand(limit, workload, state);
          expect(res.band).toBe(expectedBands[rowIndex]);
        });

        it(`${state} - ${workload}: WBGT equal to limit + 0.01°C (${(limit + 0.01).toFixed(2)}°C) moves to next allowed band (${nextExpectedBand})`, () => {
          const res = lookupLimitAndBand(limit + 0.01, workload, state);
          expect(res.band).toBe(nextExpectedBand);
        });
      });
    });
  });
});

describe('T-L-02: Worker State Strictness (Action Limit <= TLV for every row)', () => {
  const workloads: WorkloadClass[] = ['light', 'moderate', 'heavy', 'very_heavy'];

  workloads.forEach((workload) => {
    it(`verifies new_or_returning is never less strict than acclimatised for ${workload}`, () => {
      const tlvLimits = thresholdsData.acclimatised_tlv[workload];
      const actionLimits = thresholdsData.new_or_returning_action_limit[workload];

      for (let i = 0; i < tlvLimits.length; i++) {
        // Action limit must be <= TLV (stricter or equal)
        expect(actionLimits[i]).toBeLessThanOrEqual(tlvLimits[i]);
      }
    });

    it(`verifies band assigned to new_or_returning is at least as strict for identical WBGT`, () => {
      const testTemperatures = [22.0, 25.0, 27.0, 29.0, 31.0, 33.0];
      const severityOrder: Record<Band, number> = {
        green: 0,
        yellow: 1,
        orange: 2,
        red: 3,
        black: 4,
      };

      for (const t of testTemperatures) {
        const resAcclim = lookupLimitAndBand(t, workload, 'acclimatised');
        const resNew = lookupLimitAndBand(t, workload, 'new_or_returning');

        expect(severityOrder[resNew.band]).toBeGreaterThanOrEqual(
          severityOrder[resAcclim.band]
        );
      }
    });
  });
});

describe('T-L-03: Config Integrity & Provenance', () => {
  it('every threshold section has source and verified fields', () => {
    const raw = thresholdsData as any;
    expect(raw.meta).toHaveProperty('source');
    expect(raw.meta).toHaveProperty('verified');

    expect(raw.acclimatised_tlv).toHaveProperty('source');
    expect(raw.acclimatised_tlv).toHaveProperty('verified');

    expect(raw.new_or_returning_action_limit).toHaveProperty('source');
    expect(raw.new_or_returning_action_limit).toHaveProperty('verified');

    expect(raw.work_minutes_per_hour).toHaveProperty('source');
    expect(raw.work_minutes_per_hour).toHaveProperty('verified');

    expect(raw.hydration).toHaveProperty('source');
    expect(raw.hydration).toHaveProperty('verified');

    expect(raw.constants).toHaveProperty('source');
    expect(raw.constants).toHaveProperty('verified');
  });

  it('prints warning listing unverified and assumed entries without failing build silently', () => {
    const { unverified, assumed } = checkConfigIntegrity();
    console.warn(`[T-L-03 Config Integrity Warning] Found unverified sections:`, unverified);
    console.warn(`[T-L-03 Config Integrity Warning] Found assumed flags:`, assumed);

    // Confirms flags are detected
    expect(unverified).toContain('acclimatised_tlv');
    expect(assumed.some((s) => s.includes('moderate[1]'))).toBe(true);
  });
});
