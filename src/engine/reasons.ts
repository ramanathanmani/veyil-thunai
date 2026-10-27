/**
 * Plain-language reason generator and message template mapper.
 *
 * Translates meteorological conditions into 1-3 dominant physical factors
 * and deterministic template IDs for speech and visual display.
 */

import { Band } from './limits';

export type ReasonFactor = 'humid' | 'sun' | 'hot' | 'still_air';

export interface WeatherFactorsInput {
  tempC: number;
  rhPct: number;
  solarWm2?: number | null;
  windSpeed10m?: number;
  dewPointC?: number;
}

/**
 * Identifies the dominant heat stress factors based on meteorological inputs.
 */
export function identifyDominantReasons(
  input: WeatherFactorsInput,
  band: Band
): ReasonFactor[] {
  const reasons: ReasonFactor[] = [];
  const { tempC, rhPct, solarWm2 = 0, windSpeed10m = 2.0, dewPointC } = input;

  // Factor thresholds
  const isHumid = rhPct >= 65 || (dewPointC !== undefined && dewPointC >= 23.5);
  const isSun = (solarWm2 || 0) >= 400;
  const isHot = tempC >= 34.0;
  const isStillAir = windSpeed10m <= 1.5;

  if (band === 'green') {
    // If conditions are safe, still identify if humidity or sun is noticeable
    if (isSun) reasons.push('sun');
    if (isHumid) reasons.push('humid');
    return reasons.slice(0, 2);
  }

  // Rank factors based on severity
  const candidates: { factor: ReasonFactor; weight: number }[] = [];

  if (isHot) {
    candidates.push({ factor: 'hot', weight: tempC - 33.0 });
  }
  if (isHumid) {
    candidates.push({ factor: 'humid', weight: (rhPct - 60.0) / 10.0 });
  }
  if (isSun) {
    candidates.push({ factor: 'sun', weight: (solarWm2 || 0) / 300.0 });
  }
  if (isStillAir) {
    candidates.push({ factor: 'still_air', weight: (2.0 - windSpeed10m) * 1.5 });
  }

  // Sort descending by weight
  candidates.sort((a, b) => b.weight - a.weight);

  // Take top 2-3 factors
  for (const c of candidates) {
    if (reasons.length < 3) {
      reasons.push(c.factor);
    }
  }

  // If none exceeded strict thresholds but band is non-green, provide closest factor
  if (reasons.length === 0) {
    if (rhPct >= 50) reasons.push('humid');
    if ((solarWm2 || 0) >= 200) reasons.push('sun');
    if (tempC >= 30) reasons.push('hot');
  }

  return reasons;
}

/**
 * Returns deterministic message template IDs for spoken audio read-out and display.
 */
export function getTemplateIdsForPlan(
  band: Band,
  reasons: ReasonFactor[]
): string[] {
  const templateIds: string[] = [];

  // 1. Primary band summary
  templateIds.push(`plan.${band}.now`);

  // 2. Explanatory reason templates
  for (const r of reasons) {
    templateIds.push(`reason.${r}`);
  }

  // 3. Recommended action template
  if (band === 'green') {
    templateIds.push('act.drink_now');
  } else if (band === 'yellow' || band === 'orange') {
    templateIds.push('act.rest_shade');
    templateIds.push('act.drink_now');
  } else if (band === 'red') {
    templateIds.push('act.rest_shade');
  } else {
    // black
    templateIds.push('act.stop_work');
  }

  return templateIds;
}
