/**
 * Liljegren et al. (2008) Wet Bulb Globe Temperature (WBGT) model in pure TypeScript.
 *
 * Reference: Liljegren, J. C., R. A. Carhart, P. Lawday, S. Tschopp, and R. Sharp (2008):
 * "Modeling the Wet Bulb Globe Temperature Using Standard Meteorological Measurements."
 * Journal of Occupational and Environmental Hygiene, 5:10, 645-655.
 *
 * Original C code Copyright (c) 2008, UChicago Argonne, LLC under Contract DE-AC02-06CH11357.
 * Free of browser APIs (runs cleanly in Node and Browser environments).
 */

import { calculateSolarParameters } from './solar';
import constantsData from '../../config/constants.json';
import thresholdsData from '../../config/thresholds.json';

export const WIND_10M_TO_2M_DEFAULT: number =
  (constantsData.constants?.WIND_10M_TO_2M?.value as number | undefined) ??
  (thresholdsData.constants?.WIND_10M_TO_2M as number | undefined) ??
  0.6;

export interface WbgtInput {
  date: Date | string; // Date or ISO string
  lat: number;
  lon: number;
  tempC: number; // Air temperature (dry bulb) in Celsius
  rhPct: number; // Relative humidity % [0, 100]
  windSpeed10m?: number; // 10-meter wind speed in m/s
  windSpeed2m?: number; // 2-meter wind speed in m/s (preferred if known)
  wind10mTo2mFactor?: number; // Custom conversion factor if overriding config
  solarWm2?: number | null; // Solar radiation in W/m^2. If null, triggers fallback
  pressureHpa?: number; // Barometric pressure in hPa (default 1005.0)
  inShade?: boolean; // If worker is under full shade
}

export interface WbgtResult {
  wbgtC: number; // Outdoor WBGT (deg C, rounded to 1 decimal place)
  rawWbgtC: number; // Full precision WBGT (deg C)
  globeC: number; // Globe temperature Tg (deg C)
  natWetBulbC: number; // Natural wet bulb temperature Tnwb (deg C)
  psyWetBulbC: number; // Psychrometric wet bulb temperature Tpsy (deg C)
  isFallbackSimple: boolean; // True if calculated via simplified fallback formula
  calculationMethod: 'liljegren' | 'simple_formula_fallback';
  wind2mMs: number; // Applied 2-meter wind speed
}

// Physical constants
const STEFANB = 5.6696e-8;
const Cp = 1003.5;
const M_AIR = 28.97;
const M_H2O = 18.015;
const RATIO = (Cp * M_AIR) / M_H2O;
const R_GAS = 8314.34;
const R_AIR = R_GAS / M_AIR;
const Pr = Cp / (Cp + 1.25 * R_AIR);

// Sensor dimensions & radiative properties
const EMIS_WICK = 0.95;
const ALB_WICK = 0.4;
const D_WICK = 0.007; // 7mm
const L_WICK = 0.0254; // 25.4mm

const EMIS_GLOBE = 0.95;
const ALB_GLOBE = 0.05;
const D_GLOBE = 0.0508; // 2 inches (50.8mm)

const EMIS_SFC = 0.999;
const ALB_SFC = 0.45;

const MIN_SPEED = 1.028889; // 2.0 knots minimum speed standard in pywbgt / Liljegren
const CONVERGENCE = 0.02; // 0.02 K convergence tolerance
const MAX_ITER = 50;

/**
 * Calculates saturation vapor pressure (hPa) using Buck's (1981) formula.
 */
export function saturationVaporPressure(tk: number): number {
  const y = (tk - 273.15) / (tk - 32.18);
  const es = 6.1121 * Math.exp(17.502 * y);
  return 1.004 * es;
}

/**
 * Calculates dew point (Kelvin) from vapor pressure in hPa.
 */
export function dewPointFromVaporPressure(eHpa: number): number {
  const z = Math.log(Math.max(1e-4, eHpa) / (6.1121 * 1.004));
  return 273.15 + (240.97 * z) / (17.502 - z);
}

/**
 * Calculates atmospheric emissivity (Oke 2nd edition).
 */
export function atmosphericEmissivity(tk: number, rhFraction: number): number {
  const e = rhFraction * saturationVaporPressure(tk);
  return 0.575 * Math.pow(Math.max(0.01, e), 0.143);
}

/**
 * Heat of vaporization of water J/(kg K) for 283-313 K.
 */
export function latentHeatEvap(tk: number): number {
  return ((313.15 - tk) / 30.0) * -71100.0 + 2.4073e6;
}

/**
 * Air dynamic viscosity (kg/(m s)).
 */
export function airViscosity(tk: number): number {
  const sigma = 3.617;
  const epsKappa = 97.0;
  const tr = tk / epsKappa;
  const omega = ((tr - 2.9) / 0.4) * -0.034 + 1.048;
  return (2.6693e-6 * Math.sqrt(M_AIR * tk)) / (sigma * sigma * omega);
}

/**
 * Air thermal conductivity W/(m K).
 */
export function airThermalConductivity(tk: number): number {
  return (Cp + 1.25 * R_AIR) * airViscosity(tk);
}

/**
 * Diffusivity of water vapor in air (m^2/s).
 */
export function waterVaporDiffusivity(tk: number, pairHpa: number): number {
  const pcritAir = 36.4;
  const pcritH2o = 218.0;
  const tcritAir = 132.0;
  const tcritH2o = 647.3;
  const a = 3.64e-4;
  const b = 2.334;

  const pcrit13 = Math.pow(pcritAir * pcritH2o, 1.0 / 3.0);
  const tcrit512 = Math.pow(tcritAir * tcritH2o, 5.0 / 12.0);
  const tcrit12 = Math.sqrt(tcritAir * tcritH2o);
  const mmix = Math.sqrt(1.0 / M_AIR + 1.0 / M_H2O);
  const patm = pairHpa / 1013.25;

  return a * Math.pow(tk / tcrit12, b) * pcrit13 * tcrit512 * mmix / patm * 1e-4;
}

/**
 * Convective heat transfer coefficient for sphere in air (W/(m^2 K)).
 */
export function hSphereInAir(diameter: number, tk: number, pairHpa: number, speed: number): number {
  const density = (pairHpa * 100.0) / (R_AIR * tk);
  const re = (speed * density * diameter) / airViscosity(tk);
  const nu = 2.0 + 0.6 * Math.sqrt(re) * Math.pow(Pr, 0.3333);
  return (nu * airThermalConductivity(tk)) / diameter;
}

/**
 * Convective heat transfer coefficient for long cylinder in cross flow (W/(m^2 K)).
 */
export function hCylinderInAir(
  diameter: number,
  _length: number,
  tk: number,
  pairHpa: number,
  speed: number
): number {
  const a = 0.56;
  const b = 0.281;
  const c = 0.4;
  const density = (pairHpa * 100.0) / (R_AIR * tk);
  const re = (speed * density * diameter) / airViscosity(tk);
  const nu = b * Math.pow(re, 1.0 - c) * Math.pow(Pr, 1.0 - a);
  return (nu * airThermalConductivity(tk)) / diameter;
}

/**
 * Solves for black globe temperature Tg (Celsius) using iterative heat balance.
 */
export function computeGlobeTemperature(
  tairK: number,
  rhFraction: number,
  pairHpa: number,
  speed: number,
  solarAdj: number,
  fdir: number,
  cza: number,
  dGlobe: number = D_GLOBE
): number {
  const tsfc = tairK;
  let tglobePrev = tairK;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const tref = 0.5 * (tglobePrev + tairK);
    const h = hSphereInAir(dGlobe, tref, pairHpa, speed);

    const term1 = 0.5 * (atmosphericEmissivity(tairK, rhFraction) * Math.pow(tairK, 4) + EMIS_SFC * Math.pow(tsfc, 4));
    const term2 = (h / (STEFANB * EMIS_GLOBE)) * (tglobePrev - tairK);
    const directTerm = cza > 0 ? fdir * (1.0 / (2.0 * cza) - 1.0) : 0;
    const term3 = (solarAdj / (2.0 * STEFANB * EMIS_GLOBE)) * (1.0 - ALB_GLOBE) * (directTerm + 1.0 + ALB_SFC);

    const val = term1 - term2 + term3;
    if (val <= 0) return tairK - 273.15;

    const tglobeNew = Math.pow(val, 0.25);
    if (Math.abs(tglobeNew - tglobePrev) < CONVERGENCE) {
      return tglobeNew - 273.15;
    }
    tglobePrev = 0.9 * tglobePrev + 0.1 * tglobeNew;
  }

  return tglobePrev - 273.15;
}

/**
 * Solves for natural wet bulb temperature Tnwb (Celsius) or psychrometric wet bulb (if rad=0).
 */
export function computeNaturalWetBulb(
  tairK: number,
  rhFraction: number,
  pairHpa: number,
  speed: number,
  solarAdj: number,
  fdir: number,
  cza: number,
  rad: number = 1
): number {
  const a = 0.56;
  const tsfc = tairK;
  const sza = Math.acos(Math.max(-1.0, Math.min(1.0, cza)));
  const eair = rhFraction * saturationVaporPressure(tairK);
  const tdew = dewPointFromVaporPressure(eair);
  let twbPrev = tdew;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const tref = 0.5 * (twbPrev + tairK);
    let heat = 0.0;

    if (rad === 1) {
      const eAtm = atmosphericEmissivity(tairK, rhFraction);
      const fatm =
        STEFANB *
          EMIS_WICK *
          (0.5 * (eAtm * Math.pow(tairK, 4) + EMIS_SFC * Math.pow(tsfc, 4)) - Math.pow(twbPrev, 4)) +
        (1.0 - ALB_WICK) *
          solarAdj *
          ((1.0 - fdir) * (1.0 + (0.25 * D_WICK) / L_WICK) +
            fdir * (Math.tan(sza) / Math.PI + (0.25 * D_WICK) / L_WICK) +
            ALB_SFC);
      const h = hCylinderInAir(D_WICK, L_WICK, tref, pairHpa, speed);
      heat = fatm / h;
    }

    const ewick = saturationVaporPressure(twbPrev);
    const density = (pairHpa * 100.0) / (R_AIR * tref);
    const sc = airViscosity(tref) / (density * waterVaporDiffusivity(tref, pairHpa));
    const twbNew =
      tairK -
      (latentHeatEvap(tref) / RATIO) *
        ((ewick - eair) / (pairHpa - ewick)) *
        Math.pow(Pr / sc, a) +
      heat;

    if (Math.abs(twbNew - twbPrev) < CONVERGENCE) {
      return twbNew - 273.15;
    }
    twbPrev = 0.9 * twbPrev + 0.1 * twbNew;
  }

  return twbPrev - 273.15;
}

/**
 * Simplified WBGT approximation (ACSM / Bureau of Meteorology formula).
 * Used ONLY as a labeled rough fallback when solar radiation data is missing.
 */
export function computeWbgtSimpleFallback(tempC: number, rhPct: number): number {
  const eHpa = (rhPct / 100.0) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  return 0.567 * tempC + 0.393 * eHpa + 3.94;
}

/**
 * Computes the outdoor WBGT according to the Liljegren et al. (2008) model.
 * If solar radiation is null/undefined, safely falls back to the labeled simple formula.
 */
export function calculateWBGT(input: WbgtInput): WbgtResult {
  const {
    date,
    lat,
    lon,
    tempC,
    rhPct,
    solarWm2,
    windSpeed10m = 2.0,
    windSpeed2m,
    pressureHpa = 1005.0,
    inShade = false,
  } = input;

  // 10m to 2m wind conversion factor loaded from config with Liljegren height adjustment
  const windFactor = input.wind10mTo2mFactor ?? WIND_10M_TO_2M_DEFAULT;
  const effectiveWind2m = windSpeed2m !== undefined ? windSpeed2m : windSpeed10m * windFactor;
  const clampedWind2m = Math.max(MIN_SPEED, effectiveWind2m * Math.pow(2.0 / 10.0, 0.07));

  // Check if solar radiation data is missing -> fallback to simple formula
  if (solarWm2 === null || solarWm2 === undefined || isNaN(solarWm2)) {
    const fallbackVal = computeWbgtSimpleFallback(tempC, rhPct);
    return {
      wbgtC: Math.round(fallbackVal * 10) / 10,
      rawWbgtC: fallbackVal,
      globeC: tempC,
      natWetBulbC: fallbackVal,
      psyWetBulbC: fallbackVal,
      isFallbackSimple: true,
      calculationMethod: 'simple_formula_fallback',
      wind2mMs: effectiveWind2m,
    };
  }

  // 1. Compute solar position & irradiance
  const solarParams = calculateSolarParameters(date, lat, lon, solarWm2, inShade);

  const tairK = tempC + 273.15;
  const rhFraction = Math.max(0.01, Math.min(1.0, rhPct / 100.0));

  // 2. Compute globe temperature Tg
  const globeC = computeGlobeTemperature(
    tairK,
    rhFraction,
    pressureHpa,
    clampedWind2m,
    solarParams.solarAdj,
    solarParams.fdir,
    solarParams.cza
  );

  // 3. Compute natural wet bulb Tnwb (with radiation)
  const natWetBulbC = computeNaturalWetBulb(
    tairK,
    rhFraction,
    pressureHpa,
    clampedWind2m,
    solarParams.solarAdj,
    solarParams.fdir,
    solarParams.cza,
    1
  );

  // 4. Compute psychrometric wet bulb Tpsy (without radiation)
  const psyWetBulbC = computeNaturalWetBulb(
    tairK,
    rhFraction,
    pressureHpa,
    clampedWind2m,
    0.0,
    0.0,
    solarParams.cza,
    0
  );

  // 5. Combine outdoor WBGT: 10% Tair + 20% Tg + 70% Tnwb
  const rawWbgtC = 0.1 * tempC + 0.2 * globeC + 0.7 * natWetBulbC;
  const wbgtC = Math.round(rawWbgtC * 10) / 10;

  return {
    wbgtC,
    rawWbgtC,
    globeC: Math.round(globeC * 100) / 100,
    natWetBulbC: Math.round(natWetBulbC * 100) / 100,
    psyWetBulbC: Math.round(psyWetBulbC * 100) / 100,
    isFallbackSimple: false,
    calculationMethod: 'liljegren',
    wind2mMs: Math.round(effectiveWind2m * 100) / 100,
  };
}
