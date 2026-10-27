/**
 * Risk Plan Pipeline.
 *
 * Implements Section 6.1:
 * Computes solar position, outdoor WBGT (Liljegren), limit table lookup,
 * work-rest schedule, dominant physical reasons, and template IDs per forecast hour.
 */

import { calculateWBGT } from './wbgt';
import {
  Band,
  WorkloadClass,
  WorkerState,
  lookupLimitAndBand,
} from './limits';
import {
  ReasonFactor,
  identifyDominantReasons,
  getTemplateIdsForPlan,
} from './reasons';

export type { Band, WorkloadClass, WorkerState, ReasonFactor };

export type DataQuality = 'forecast' | 'cached_stale' | 'sample';

export interface HourPlan {
  hourISO: string; // Asia/Kolkata ISO timestamp
  wbgtC: number; // estimate, 1 decimal
  band: Band;
  maxWorkMinPerHour: number | null; // null when above the strictest row (black band)
  minRestMinPerHour: number | null;
  reasons: ReasonFactor[];
  templateIds: string[]; // message templates to show/speak
  dataQuality: DataQuality;
  isFallbackSimple: boolean;
  calculationMethod: 'liljegren' | 'simple_formula_fallback';
  // Diagnostics
  globeC?: number;
  natWetBulbC?: number;
  tempC: number;
  rhPct: number;
  solarWm2?: number | null;
}

export interface HourlyForecastItem {
  timeISO: string; // ISO string
  tempC: number;
  rhPct: number;
  dewPointC?: number;
  solarWm2?: number | null;
  windSpeed10m?: number;
  windSpeed2m?: number;
  pressureHpa?: number;
}

export interface PlanOptions {
  lat: number;
  lon: number;
  workload: WorkloadClass;
  workerState: WorkerState;
  inShade?: boolean;
  dataQuality?: DataQuality;
}

/**
 * Generates an HourPlan for a single forecast hour.
 */
export function buildHourPlan(
  item: HourlyForecastItem,
  options: PlanOptions
): HourPlan {
  const {
    lat,
    lon,
    workload,
    workerState,
    inShade = false,
    dataQuality = 'forecast',
  } = options;

  // 1. Compute outdoor WBGT using Liljegren
  const wbgtResult = calculateWBGT({
    date: item.timeISO,
    lat,
    lon,
    tempC: item.tempC,
    rhPct: item.rhPct,
    solarWm2: item.solarWm2,
    windSpeed10m: item.windSpeed10m,
    windSpeed2m: item.windSpeed2m,
    pressureHpa: item.pressureHpa || 1005.0,
    inShade,
  });

  // 2. Limit lookup & Work-Rest schedule
  const schedule = lookupLimitAndBand(wbgtResult.wbgtC, workload, workerState);

  // 3. Identify dominant physical reasons
  const reasons = identifyDominantReasons(
    {
      tempC: item.tempC,
      rhPct: item.rhPct,
      solarWm2: inShade ? 0 : item.solarWm2,
      windSpeed10m: item.windSpeed10m,
      dewPointC: item.dewPointC,
    },
    schedule.band
  );

  // 4. Message template mapping
  const templateIds = getTemplateIdsForPlan(schedule.band, reasons);

  return {
    hourISO: item.timeISO,
    wbgtC: wbgtResult.wbgtC,
    band: schedule.band,
    maxWorkMinPerHour: schedule.maxWorkMinPerHour,
    minRestMinPerHour: schedule.minRestMinPerHour,
    reasons,
    templateIds,
    dataQuality,
    isFallbackSimple: wbgtResult.isFallbackSimple,
    calculationMethod: wbgtResult.calculationMethod,
    globeC: wbgtResult.globeC,
    natWetBulbC: wbgtResult.natWetBulbC,
    tempC: item.tempC,
    rhPct: item.rhPct,
    solarWm2: item.solarWm2,
  };
}

/**
 * Finds the plan matching the current IST/local hour, or the nearest available forecast hour.
 */
export function findCurrentHourPlan(plans: HourPlan[], now: Date = new Date()): HourPlan | null {
  if (!plans || plans.length === 0) return null;

  // 1. Try matching Asia/Kolkata date and hour prefix (e.g. "2026-10-27T14:")
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    let h = parts.find((p) => p.type === 'hour')?.value;
    if (h === '24') h = '00';

    if (y && m && d && h) {
      const targetPrefix = `${y}-${m}-${d}T${h}:`;
      const match = plans.find((p) => p.hourISO.startsWith(targetPrefix));
      if (match) return match;
    }
  } catch {
    // ignore Intl timezone errors and try standard matching
  }

  // 2. Try matching the hour number within the day (0..23)
  const currentHourNum = now.getHours();
  const hourMatch = plans.find((p) => {
    const tIndex = p.hourISO.indexOf('T');
    if (tIndex !== -1) {
      const planHour = parseInt(p.hourISO.slice(tIndex + 1, tIndex + 3), 10);
      return planHour === currentHourNum;
    }
    return false;
  });
  if (hourMatch) return hourMatch;

  // 3. Find closest hour in time
  const nowMs = now.getTime();
  let closest = plans[0];
  let minDiff = Infinity;
  for (const p of plans) {
    const pTime = new Date(p.hourISO).getTime();
    if (!isNaN(pTime)) {
      const diff = Math.abs(pTime - nowMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
  }

  return closest || plans[0];
}

/**
 * Generates a full day or multi-hour plan from a series of forecast hours.
 */
export function buildDayPlan(
  forecastItems: HourlyForecastItem[],
  options: PlanOptions
): HourPlan[] {
  return forecastItems.map((item) => buildHourPlan(item, options));
}

/**
 * Checks if a given ISO hour string falls within the 11:00 - 16:00 IST peak heat window
 * advisory defined by NDMA.
 */
export function isPeakHeatHour(hourISO: string): boolean {
  try {
    const tIndex = hourISO.indexOf('T');
    if (tIndex !== -1) {
      const h = parseInt(hourISO.slice(tIndex + 1, tIndex + 3), 10);
      if (!isNaN(h)) return h >= 11 && h < 16;
    }
    const d = new Date(hourISO);
    const h = d.getHours();
    return h >= 11 && h < 16;
  } catch {
    return false;
  }
}

