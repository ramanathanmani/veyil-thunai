/**
 * Occupational heat exposure limit lookup tables and work-rest scheduling.
 *
 * Implements NIOSH / ACGIH threshold limits for acclimatised (TLV)
 * and unacclimatised / returning workers (Action Limit).
 */

import thresholdsData from '../../config/thresholds.json';

export type Band = 'green' | 'yellow' | 'orange' | 'red' | 'black';
export type WorkloadClass = 'light' | 'moderate' | 'heavy' | 'very_heavy';
export type WorkerState = 'acclimatised' | 'new_or_returning';

export interface WorkRestSchedule {
  band: Band;
  workShare: '75-100' | '50-75' | '25-50' | '0-25' | 'above_limit';
  maxWorkMinPerHour: number | null;
  minRestMinPerHour: number | null;
  thresholdLimitC: number;
}

export interface ThresholdsConfig {
  acclimatised_tlv: {
    bands: string[];
    light: number[];
    moderate: number[];
    heavy: number[];
    very_heavy: number[];
  };
  new_or_returning_action_limit: {
    bands: string[];
    light: number[];
    moderate: number[];
    heavy: number[];
    very_heavy: number[];
  };
  work_minutes_per_hour: Record<string, [number, number]>;
  hydration: {
    cup_ml: number;
    every_minutes: [number, number];
  };
}

export const THRESHOLDS = thresholdsData as unknown as ThresholdsConfig;

/**
 * Checks config integrity and prints warnings for unverified or assumed values.
 * Required for test T-L-03.
 */
export function checkConfigIntegrity(): { unverified: string[]; assumed: string[] } {
  const unverified: string[] = [];
  const assumed: string[] = [];

  const raw = thresholdsData as any;
  if (!raw.meta?.verified) unverified.push('meta');
  if (!raw.acclimatised_tlv?.verified) unverified.push('acclimatised_tlv');
  if (!raw.new_or_returning_action_limit?.verified) unverified.push('new_or_returning_action_limit');
  if (!raw.work_minutes_per_hour?.verified) unverified.push('work_minutes_per_hour');
  if (!raw.hydration?.verified) unverified.push('hydration');
  if (!raw.constants?.verified) unverified.push('constants');

  if (raw.acclimatised_tlv?.flags) {
    for (const [key, val] of Object.entries(raw.acclimatised_tlv.flags)) {
      if (typeof val === 'string' && val.includes('assumed')) {
        assumed.push(`acclimatised_tlv.${key}: ${val}`);
      }
    }
  }

  return { unverified, assumed };
}

/**
 * Given WBGT (°C), worker workload class, and acclimatisation state,
 * finds the highest work share whose limit is >= WBGT.
 *
 * Comparison rule: if WBGT <= limit[row], the worker stays in that row.
 */
export function lookupLimitAndBand(
  wbgtC: number,
  workload: WorkloadClass,
  workerState: WorkerState = 'acclimatised'
): WorkRestSchedule {
  const table =
    workerState === 'acclimatised'
      ? THRESHOLDS.acclimatised_tlv
      : THRESHOLDS.new_or_returning_action_limit;

  const limits = table[workload]; // 4 thresholds corresponding to 75-100%, 50-75%, 25-50%, 0-25%
  const bands: Band[] = ['green', 'yellow', 'orange', 'red'];
  const workShares: ('75-100' | '50-75' | '25-50' | '0-25')[] = [
    '75-100',
    '50-75',
    '25-50',
    '0-25',
  ];

  // Pick the highest allowed work share whose limit is >= WBGT
  for (let i = 0; i < limits.length; i++) {
    // Round to 2 decimals to prevent floating point imprecision on boundary checks
    const roundedWbgt = Math.round(wbgtC * 100) / 100;
    const limit = limits[i];

    if (roundedWbgt <= limit) {
      const share = workShares[i];
      const [, maxWork] = THRESHOLDS.work_minutes_per_hour[share] || [0, 60];
      return {
        band: bands[i],
        workShare: share,
        maxWorkMinPerHour: maxWork,
        minRestMinPerHour: 60 - maxWork,
        thresholdLimitC: limit,
      };
    }
  }

  // WBGT exceeds the 0-25% limit -> Black band
  return {
    band: 'black',
    workShare: 'above_limit',
    maxWorkMinPerHour: null,
    minRestMinPerHour: null,
    thresholdLimitC: limits[3],
  };
}
