/**
 * Solar position and irradiance calculations using NOAA Solar Position Algorithm
 * and Liljegren (2008) solar parameter formulations.
 *
 * Free of browser APIs (pure TypeScript, runs in Node and Browser).
 */

export interface SolarParams {
  apparentZenithDeg: number;
  elevationDeg: number;
  cza: number; // Cosine of solar zenith angle
  solarAdj: number; // Irradiance adjusted for TOA limits (W/m^2)
  fdir: number; // Direct beam fraction [0.0, 0.9]
  distanceAU: number; // Earth-Sun distance in AU
}

export const SOLAR_CONST = 1367.0; // Solar constant W/m^2
export const CZA_MIN = 0.00873; // Minimum cosine of zenith angle (~89.5 deg)
export const NORMSOLAR_MAX = 0.85; // Upper bound for normalized solar irradiance

/**
 * Calculates solar position and radiation components for a given time, location, and measured solar irradiance.
 *
 * @param date - Date object or ISO string in any timezone (evaluated in UTC)
 * @param lat - Latitude in decimal degrees (North positive)
 * @param lon - Longitude in decimal degrees (East positive)
 * @param solarRaw - Measured or forecast shortwave solar radiation (W/m^2)
 * @param inShade - If true, treats radiation at worker location as 0
 */
export function calculateSolarParameters(
  date: Date | string,
  lat: number,
  lon: number,
  solarRaw: number,
  inShade: boolean = false
): SolarParams {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Extract UTC components
  let year = d.getUTCFullYear();
  let month = d.getUTCMonth() + 1; // 1-12
  const day = d.getUTCDate();
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60.0 + d.getUTCSeconds() / 3600.0;

  // Julian Day calculation
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5 +
    hour / 24.0;

  const t = (jd - 2451545.0) / 36525.0; // Julian centuries since J2000.0

  // NOAA Solar Position formulas
  const geomMeanLongSun = (280.46646 + t * (36000.76983 + 0.0003032 * t)) % 360;
  const geomMeanAnomSun = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentEarthOrbit = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const mRad = (geomMeanAnomSun * Math.PI) / 180.0;
  const sunEqOfCtr =
    Math.sin(mRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * mRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * mRad) * 0.000289;

  const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
  const sunTrueAnom = geomMeanAnomSun + sunEqOfCtr;
  const vRad = (sunTrueAnom * Math.PI) / 180.0;
  const distanceAU =
    (1.000001018 * (1 - eccentEarthOrbit * eccentEarthOrbit)) /
    (1 + eccentEarthOrbit * Math.cos(vRad));

  const sunAppLong =
    sunTrueLong - 0.00569 - 0.00478 * Math.sin(((125.04 - 1934.136 * t) * Math.PI) / 180.0);
  const meanObliqEcliptic =
    23.0 + (26.0 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813)))) / 3600.0;
  const obliqCorr =
    meanObliqEcliptic + 0.00256 * Math.cos(((125.04 - 1934.136 * t) * Math.PI) / 180.0);

  const sunDeclinRad = Math.asin(
    Math.sin((obliqCorr * Math.PI) / 180.0) * Math.sin((sunAppLong * Math.PI) / 180.0)
  );

  // Equation of time (minutes)
  const vary = Math.tan(((obliqCorr / 2) * Math.PI) / 180.0) ** 2;
  const l0Rad = (geomMeanLongSun * Math.PI) / 180.0;
  const eqOfTime =
    4.0 *
    ((180.0 / Math.PI) *
      (vary * Math.sin(2 * l0Rad) -
        2 * eccentEarthOrbit * Math.sin(mRad) +
        4 * eccentEarthOrbit * vary * Math.sin(mRad) * Math.cos(2 * l0Rad) -
        0.5 * vary * vary * Math.sin(4 * l0Rad) -
        1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * mRad)));

  // Solar time and hour angle
  const timeOffset = eqOfTime + 4.0 * lon;
  const tMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60.0;
  let trueSolarTime = (tMin + timeOffset) % 1440;
  if (trueSolarTime < 0) trueSolarTime += 1440;

  let hourAngle = trueSolarTime / 4.0 - 180.0;
  if (hourAngle < -180.0) hourAngle += 360.0;

  const haRad = (hourAngle * Math.PI) / 180.0;
  const latRad = (lat * Math.PI) / 180.0;

  let cosZenith =
    Math.sin(latRad) * Math.sin(sunDeclinRad) +
    Math.cos(latRad) * Math.cos(sunDeclinRad) * Math.cos(haRad);
  cosZenith = Math.max(-1.0, Math.min(1.0, cosZenith));
  const zenithDeg = (Math.acos(cosZenith) * 180.0) / Math.PI;

  // Atmospheric refraction
  const elev = 90.0 - zenithDeg;
  let refractionDeg = 0.0;
  if (elev <= 85.0) {
    if (elev > 5.0) {
      const tanEl = Math.tan((elev * Math.PI) / 180.0);
      refractionDeg = 58.1 / tanEl - 0.07 / Math.pow(tanEl, 3) + 0.000086 / Math.pow(tanEl, 5);
    } else if (elev > -0.575) {
      refractionDeg = 1735.0 + elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711)));
    } else {
      const tanEl = Math.tan((elev * Math.PI) / 180.0);
      refractionDeg = -20.772 / tanEl;
    }
    refractionDeg /= 3600.0;
  }

  const apparentZenithDeg = Math.max(0.0, zenithDeg - refractionDeg);
  const elevationDeg = 90.0 - apparentZenithDeg;
  const cza = Math.cos((apparentZenithDeg * Math.PI) / 180.0);

  // Irradiance & direct beam calculations
  let solarAdj = inShade ? 0.0 : Math.max(0.0, solarRaw);
  let fdir = 0.0;

  if (cza < CZA_MIN || inShade) {
    solarAdj = 0.0;
    fdir = 0.0;
  } else {
    const toasolar = (SOLAR_CONST * Math.max(0.0, cza)) / (distanceAU * distanceAU);
    const normsolar = Math.min(solarAdj / toasolar, NORMSOLAR_MAX);
    solarAdj = normsolar * toasolar;

    if (normsolar > 0.0) {
      const direct = Math.exp(3.0 - 1.34 * normsolar - 1.65 / normsolar);
      fdir = Math.max(0.0, Math.min(0.9, direct));
    } else {
      fdir = 0.0;
    }
  }

  return {
    apparentZenithDeg,
    elevationDeg,
    cza,
    solarAdj,
    fdir,
    distanceAU,
  };
}
