import type { Locale } from '../i18n';
import { roundToOneDecimal, wrapAzimuth } from './horizon';
import { computeMaxMeridianAltitude, wrapHours } from './equatorial';

export const SOLAR_DEG_PER_DAY = 0.9856; // 360° / 365.25 days

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter' | 'none';

export interface EclipticTelemetry {
  lambdaDeg: number; // 0..359.9
  betaDeg: number; // -90..+90
  obliquityDeg: number; // 0..90
  dayOffset: number; // 0..365 from Mar 21
  dateLabel: string;
  latitudeDeg: number;
  raHours: number; // 0..23.9
  decDeg: number; // -90..+90
  solarDecDeg: number; // Dec when beta = 0
  solarRaHours: number; // RA when beta = 0
  noonSunAltitudeDeg: number; // 90 - |lat - solarDec|
  seasonId: SeasonId;
  seasonLabel: string;
  isOnEcliptic: boolean;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const TH_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Convert days since Vernal Equinox (~Mar 21) into solar ecliptic longitude λ (0°–360°).
 */
export function dayOffsetToLambda(dayOffset: number): number {
  const clamped = Math.max(0, Math.min(365, Math.round(dayOffset)));
  return wrapAzimuth(clamped * SOLAR_DEG_PER_DAY);
}

/**
 * Convert solar ecliptic longitude λ (0°–360°) into approximate days since Mar 21 (0–365).
 */
export function lambdaToDayOffset(lambdaDeg: number): number {
  const norm = wrapAzimuth(lambdaDeg);
  return Math.min(365, Math.round(norm / SOLAR_DEG_PER_DAY));
}

/**
 * Format dayOffset (0 = Mar 21) into a readable Thai or English calendar date.
 */
export function formatDayOffsetDate(
  dayOffset: number,
  locale: Locale = 'th'
): string {
  const days = Math.max(0, Math.min(365, Math.round(dayOffset)));
  // Use a non-leap reference year (2025) starting on March 21 UTC
  const base = Date.UTC(2025, 2, 21);
  const dt = new Date(base + days * 86400000);
  const day = dt.getUTCDate();
  const month = dt.getUTCMonth();
  if (locale === 'th') {
    return `${day} ${TH_MONTHS[month]}`;
  }
  return `${EN_MONTHS[month]} ${day}`;
}

/**
 * Convert Ecliptic coordinates (λ, β) and obliquity ε into Equatorial (RA, Dec).
 * Exact spherical astronomy equations:
 *   sin δ = sin β cos ε + cos β sin ε sin λ
 *   α = atan2(sin λ cos ε − tan β sin ε, cos λ)
 * Evaluated in singularity-free Cartesian form (identical for all β, including ±90°):
 *   x = cos β sin λ cos ε − sin β sin ε
 *   y = sin β cos ε + cos β sin ε sin λ
 *   z = cos β cos λ
 *   α = atan2(x, z), δ = asin(y)
 */
export function eclipticToEquatorial(
  lambdaDeg: number,
  betaDeg: number,
  obliquityDeg: number
): { raHours: number; decDeg: number } {
  const lam = wrapAzimuth(lambdaDeg) * DEG2RAD;
  const bet = Math.max(-90, Math.min(90, betaDeg)) * DEG2RAD;
  const eps = Math.max(0, Math.min(90, obliquityDeg)) * DEG2RAD;

  const sinB = Math.sin(bet);
  const cosB = Math.cos(bet);
  const sinL = Math.sin(lam);
  const cosL = Math.cos(lam);
  const sinE = Math.sin(eps);
  const cosE = Math.cos(eps);

  const sinDec = Math.max(-1, Math.min(1, sinB * cosE + cosB * sinE * sinL));
  const decDeg = roundToOneDecimal(Math.asin(sinDec) * RAD2DEG);

  const num = cosB * sinL * cosE - sinB * sinE;
  const den = cosB * cosL;
  const raDeg =
    Math.hypot(num, den) < 1e-8
      ? 0
      : ((Math.atan2(num, den) * RAD2DEG) + 360) % 360;
  const raHours = wrapHours(raDeg / 15);

  return { raHours, decDeg };
}

/**
 * Determine Northern Hemisphere astronomical season from solar longitude λ and obliquity ε.
 */
export function getNorthernSeason(
  lambdaDeg: number,
  obliquityDeg: number,
  locale: Locale = 'th'
): { id: SeasonId; label: string } {
  if (obliquityDeg < 0.5) {
    return {
      id: 'none',
      label:
        locale === 'th'
          ? 'ไม่มีฤดูกาล (แกนไม่เอียง)'
          : 'No seasons (0° tilt)',
    };
  }
  const lam = wrapAzimuth(lambdaDeg);
  if (lam < 90) {
    return {
      id: 'spring',
      label: locale === 'th' ? 'ฤดูใบไม้ผลิ (ซีกโลกเหนือ)' : 'Spring (N. Hemisphere)',
    };
  }
  if (lam < 180) {
    return {
      id: 'summer',
      label: locale === 'th' ? 'ฤดูร้อน (ซีกโลกเหนือ)' : 'Summer (N. Hemisphere)',
    };
  }
  if (lam < 270) {
    return {
      id: 'autumn',
      label: locale === 'th' ? 'ฤดูใบไม้ร่วง (ซีกโลกเหนือ)' : 'Autumn (N. Hemisphere)',
    };
  }
  return {
    id: 'winter',
    label: locale === 'th' ? 'ฤดูหนาว (ซีกโลกเหนือ)' : 'Winter (N. Hemisphere)',
  };
}

/**
 * Compute full live Ecliptic telemetry snapshot.
 */
export function computeEclipticTelemetry(
  lambdaDeg: number,
  betaDeg: number,
  obliquityDeg: number,
  latitudeDeg: number,
  dayOffset?: number,
  locale: Locale = 'th'
): EclipticTelemetry {
  const lam = wrapAzimuth(lambdaDeg);
  const bet = roundToOneDecimal(Math.max(-90, Math.min(90, betaDeg)));
  const eps = roundToOneDecimal(Math.max(0, Math.min(90, obliquityDeg)));
  const lat = roundToOneDecimal(Math.max(-90, Math.min(90, latitudeDeg)));
  const resolvedDay =
    typeof dayOffset === 'number'
      ? Math.max(0, Math.min(365, Math.round(dayOffset)))
      : lambdaToDayOffset(lam);

  const objectEq = eclipticToEquatorial(lam, bet, eps);
  const sunEq = eclipticToEquatorial(lam, 0, eps);
  const noonSunAltitudeDeg = computeMaxMeridianAltitude(lat, sunEq.decDeg);
  const season = getNorthernSeason(lam, eps, locale);

  return {
    lambdaDeg: lam,
    betaDeg: bet,
    obliquityDeg: eps,
    dayOffset: resolvedDay,
    dateLabel: formatDayOffsetDate(resolvedDay, locale),
    latitudeDeg: lat,
    raHours: objectEq.raHours,
    decDeg: objectEq.decDeg,
    solarDecDeg: sunEq.decDeg,
    solarRaHours: sunEq.raHours,
    noonSunAltitudeDeg,
    seasonId: season.id,
    seasonLabel: season.label,
    isOnEcliptic: Math.abs(bet) < 0.05,
  };
}

/**
 * Local Ecliptic Sphere Cartesian coordinates inside eclipticGroup:
 *   +Z = Vernal Equinox (λ = 0°)
 *   +X = Summer Solstice (λ = 90°)
 *   +Y = North Ecliptic Pole (β = +90°)
 */
export function eclipticToLocalCartesian(
  lambdaDeg: number,
  betaDeg: number,
  radius: number
): { x: number; y: number; z: number } {
  const lamRad = wrapAzimuth(lambdaDeg) * DEG2RAD;
  const betRad = Math.max(-90, Math.min(90, betaDeg)) * DEG2RAD;
  const cosB = Math.cos(betRad);
  return {
    x: radius * cosB * Math.sin(lamRad),
    y: radius * Math.sin(betRad),
    z: radius * cosB * Math.cos(lamRad),
  };
}

/**
 * Inverse conversion from eclipticGroup local coordinates back to (λ, β).
 */
export function localCartesianToEcliptic(
  x: number,
  y: number,
  z: number
): { lambda: number; beta: number } {
  const r = Math.hypot(x, y, z) || 1;
  const clampedY = Math.max(-r, Math.min(r, y));
  const beta = roundToOneDecimal(Math.asin(clampedY / r) * RAD2DEG);
  const horiz = Math.hypot(x, z);
  const lambda =
    horiz < 1e-4 ? 0 : wrapAzimuth(Math.atan2(x, z) * RAD2DEG);
  return { lambda, beta };
}
