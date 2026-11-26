import type { Locale, LocalizedText } from '../i18n';
import { getCompassDirection, roundToOneDecimal, wrapAzimuth } from './horizon';
import { wrapHours } from './equatorial';

export type CoordinateSystemId = 'horizon' | 'equatorial' | 'ecliptic';

export interface CompareCoords {
  // Horizon (a, A) — a can be -90..+90 when star is below horizon
  altitude: number;
  azimuth: number;
  // Equatorial (α in hours 0..24, δ in deg -90..+90)
  ra: number;
  dec: number;
  // Ecliptic (λ in deg 0..360, β in deg -90..+90)
  eclipticLon: number;
  eclipticLat: number;
  // Shared parameters
  latitude: number; // φ (-90..+90)
  lst: number; // Local Sidereal Time (0..24h)
  obliquity: number; // ε (0..90°, default 23.44°)
  // Derived
  hourAngleDeg: number; // H in [-180°, +180°]
  hourAngleHours: number; // H in [-12h, +12h]
  compassName: string;
  compassCode: string;
  isAboveHorizon: boolean;
}

export interface PresetStar {
  id: string;
  name: LocalizedText;
  subtitle: LocalizedText;
  isSun?: boolean;
  /** Canonical RA in decimal hours (for stars) */
  raHours?: number;
  /** Canonical Dec in decimal degrees (for stars) */
  decDeg?: number;
  /** Ecliptic longitude λ (for Sun, β = 0°) */
  eclipticLon?: number;
}

export const DEFAULT_OBLIQUITY_COMPARE = 23.44;

export const PRESET_STARS: PresetStar[] = [
  {
    id: 'sun',
    name: { th: 'ดวงอาทิตย์', en: 'Sun' },
    subtitle: { th: 'λ = 90°, β = 0°', en: 'λ = 90°, β = 0°' },
    isSun: true,
    eclipticLon: 90,
  },
  {
    id: 'polaris',
    name: { th: 'Polaris (ดาวเหนือ)', en: 'Polaris' },
    subtitle: { th: '2h 31m, +89°16′', en: '2h 31m, +89°16′' },
    raHours: 2 + 31 / 60,
    decDeg: 89 + 16 / 60,
  },
  {
    id: 'sirius',
    name: { th: 'Sirius', en: 'Sirius' },
    subtitle: { th: '6h 45m, −16°43′', en: '6h 45m, −16°43′' },
    raHours: 6 + 45 / 60,
    decDeg: -(16 + 43 / 60),
  },
  {
    id: 'betelgeuse',
    name: { th: 'Betelgeuse', en: 'Betelgeuse' },
    subtitle: { th: '5h 55m, +7°24′', en: '5h 55m, +7°24′' },
    raHours: 5 + 55 / 60,
    decDeg: 7 + 24 / 60,
  },
  {
    id: 'antares',
    name: { th: 'Antares', en: 'Antares' },
    subtitle: { th: '16h 29m, −26°26′', en: '16h 29m, −26°26′' },
    raHours: 16 + 29 / 60,
    decDeg: -(26 + 26 / 60),
  },
  {
    id: 'vega',
    name: { th: 'Vega', en: 'Vega' },
    subtitle: { th: '18h 37m, +38°47′', en: '18h 37m, +38°47′' },
    raHours: 18 + 37 / 60,
    decDeg: 38 + 47 / 60,
  },
];

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

export function normalizeDeg360(deg: number): number {
  const n = ((deg % 360) + 360) % 360;
  return n >= 359.9999 ? 0 : n;
}

export function normalizeDegSigned180(deg: number): number {
  let n = ((deg % 360) + 360) % 360;
  if (n > 180) n -= 360;
  return n;
}

/**
 * Equatorial (α hours, δ deg) -> Horizon (a deg, A deg)
 *   sin a = sin φ sin δ + cos φ cos δ cos H
 *   A = atan2(−cos δ sin H, sin δ cos φ − cos δ sin φ cos H)
 */
export function eqToHorizonExact(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lstHours: number
): { altitude: number; azimuth: number; hourAngleDeg: number } {
  const hourAngleDeg = normalizeDegSigned180((lstHours - raHours) * 15);

  const phi = latDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const H = hourAngleDeg * DEG2RAD;

  const sinA = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const altitude = Math.asin(clampUnit(sinA)) * RAD2DEG;

  const num = -Math.cos(dec) * Math.sin(H);
  const den = Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.sin(phi) * Math.cos(H);
  const azimuth = Math.hypot(num, den) < 1e-10 ? 0 : normalizeDeg360(Math.atan2(num, den) * RAD2DEG);

  return { altitude, azimuth, hourAngleDeg };
}

/**
 * Horizon (a deg, A deg) -> Equatorial (α hours, δ deg)
 *   sin δ = sin φ sin a + cos φ cos a cos A
 *   H = atan2(−cos a sin A, sin a cos φ − cos a cos A sin φ)
 *   α = LST − H
 */
export function horizonToEqExact(
  altDeg: number,
  azDeg: number,
  latDeg: number,
  lstHours: number
): { ra: number; dec: number; hourAngleDeg: number } {
  const phi = latDeg * DEG2RAD;
  const a = altDeg * DEG2RAD;
  const A = azDeg * DEG2RAD;

  const sinDec = Math.sin(phi) * Math.sin(a) + Math.cos(phi) * Math.cos(a) * Math.cos(A);
  const dec = Math.asin(clampUnit(sinDec)) * RAD2DEG;

  const num = -Math.cos(a) * Math.sin(A);
  const den = Math.sin(a) * Math.cos(phi) - Math.cos(a) * Math.cos(A) * Math.sin(phi);
  const hourAngleDeg =
    Math.hypot(num, den) < 1e-10 ? 0 : normalizeDegSigned180(Math.atan2(num, den) * RAD2DEG);

  const alphaDeg = normalizeDeg360(lstHours * 15 - hourAngleDeg);
  const ra = alphaDeg / 15;

  return { ra, dec, hourAngleDeg };
}

/**
 * Equatorial (α hours, δ deg) -> Ecliptic (λ deg, β deg)
 *   sin β = sin δ cos ε − cos δ sin ε sin α
 *   λ = atan2(sin α cos ε cos δ + sin δ sin ε, cos α cos δ)
 */
export function eqToEclipticExact(
  raHours: number,
  decDeg: number,
  obliquityDeg: number
): { eclipticLon: number; eclipticLat: number } {
  const alpha = raHours * 15 * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const eps = obliquityDeg * DEG2RAD;

  const sinBeta = Math.sin(dec) * Math.cos(eps) - Math.cos(dec) * Math.sin(eps) * Math.sin(alpha);
  const eclipticLat = Math.asin(clampUnit(sinBeta)) * RAD2DEG;

  const num = Math.sin(alpha) * Math.cos(eps) * Math.cos(dec) + Math.sin(dec) * Math.sin(eps);
  const den = Math.cos(alpha) * Math.cos(dec);
  const eclipticLon =
    Math.hypot(num, den) < 1e-10 ? 0 : normalizeDeg360(Math.atan2(num, den) * RAD2DEG);

  return { eclipticLon, eclipticLat };
}

/**
 * Ecliptic (λ deg, β deg) -> Equatorial (α hours, δ deg)
 *   sin δ = sin β cos ε + cos β sin ε sin λ
 *   α = atan2(sin λ cos ε − tan β sin ε, cos λ)  [singularity-free form]
 */
export function eclipticToEqExact(
  lamDeg: number,
  betaDeg: number,
  obliquityDeg: number
): { ra: number; dec: number } {
  const lam = lamDeg * DEG2RAD;
  const beta = betaDeg * DEG2RAD;
  const eps = obliquityDeg * DEG2RAD;

  const sinDec = Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lam);
  const dec = Math.asin(clampUnit(sinDec)) * RAD2DEG;

  const num = Math.cos(beta) * Math.sin(lam) * Math.cos(eps) - Math.sin(beta) * Math.sin(eps);
  const den = Math.cos(beta) * Math.cos(lam);
  const alphaDeg =
    Math.hypot(num, den) < 1e-10 ? 0 : normalizeDeg360(Math.atan2(num, den) * RAD2DEG);
  const ra = alphaDeg / 15;

  return { ra, dec };
}

/**
 * Build a complete synchronized 3-system coordinate snapshot starting from any chosen source system.
 */
export function resolveCompareCoords(
  source: CoordinateSystemId,
  input: {
    altitude?: number;
    azimuth?: number;
    ra?: number;
    dec?: number;
    eclipticLon?: number;
    eclipticLat?: number;
    latitude: number;
    lst: number;
    obliquity: number;
  },
  locale: Locale = 'th'
): CompareCoords {
  const lat = Math.max(-90, Math.min(90, input.latitude));
  const lst = ((input.lst % 24) + 24) % 24;
  const eps = Math.max(0, Math.min(90, input.obliquity));

  let ra: number;
  let dec: number;
  let altitude: number;
  let azimuth: number;
  let eclipticLon: number;
  let eclipticLat: number;
  let hourAngleDeg: number;

  if (source === 'horizon') {
    altitude = Math.max(-90, Math.min(90, input.altitude ?? 45));
    azimuth = normalizeDeg360(input.azimuth ?? 120);
    const eq = horizonToEqExact(altitude, azimuth, lat, lst);
    ra = eq.ra;
    dec = eq.dec;
    hourAngleDeg = eq.hourAngleDeg;
    const ec = eqToEclipticExact(ra, dec, eps);
    eclipticLon = ec.eclipticLon;
    eclipticLat = ec.eclipticLat;
  } else if (source === 'ecliptic') {
    eclipticLon = normalizeDeg360(input.eclipticLon ?? 90);
    eclipticLat = Math.max(-90, Math.min(90, input.eclipticLat ?? 0));
    const eq = eclipticToEqExact(eclipticLon, eclipticLat, eps);
    ra = eq.ra;
    dec = eq.dec;
    const hz = eqToHorizonExact(ra, dec, lat, lst);
    altitude = hz.altitude;
    azimuth = hz.azimuth;
    hourAngleDeg = hz.hourAngleDeg;
  } else {
    ra = ((input.ra ?? 6) % 24 + 24) % 24;
    dec = Math.max(-90, Math.min(90, input.dec ?? 23.44));
    const hz = eqToHorizonExact(ra, dec, lat, lst);
    altitude = hz.altitude;
    azimuth = hz.azimuth;
    hourAngleDeg = hz.hourAngleDeg;
    const ec = eqToEclipticExact(ra, dec, eps);
    eclipticLon = ec.eclipticLon;
    eclipticLat = ec.eclipticLat;
  }

  const compass = getCompassDirection(wrapAzimuth(azimuth), locale);

  return {
    altitude,
    azimuth,
    ra,
    dec,
    eclipticLon,
    eclipticLat,
    latitude: lat,
    lst,
    obliquity: eps,
    hourAngleDeg,
    hourAngleHours: hourAngleDeg / 15,
    compassName: compass.name,
    compassCode: compass.code,
    isAboveHorizon: altitude >= 0,
  };
}

export function roundCompareDisplay(coords: CompareCoords): {
  altitude: number;
  azimuth: number;
  ra: number;
  dec: number;
  eclipticLon: number;
  eclipticLat: number;
} {
  return {
    altitude: roundToOneDecimal(coords.altitude),
    azimuth: wrapAzimuth(coords.azimuth),
    ra: wrapHours(coords.ra),
    dec: roundToOneDecimal(coords.dec),
    eclipticLon: wrapAzimuth(coords.eclipticLon),
    eclipticLat: roundToOneDecimal(coords.eclipticLat),
  };
}
