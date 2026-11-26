import type { Locale } from '../i18n';
import {
  getCompassDirection,
  roundToOneDecimal,
  wrapAzimuth,
} from './horizon';

export type StarVisibilityStatus = 'circumpolar' | 'never-rises' | 'rises-sets';

export interface EquatorialTelemetry {
  raHours: number;
  decDeg: number;
  latitudeDeg: number;
  lstHours: number;
  hourAngleHours: number; // (-12, +12]
  poleAltitudeDeg: number; // equals observer latitude (signed: +N, -S)
  altitudeDeg: number; // live Altitude [-90, +90]
  azimuthDeg: number; // live Azimuth [0, 360)
  compassName: string;
  compassCode: string;
  maxMeridianAltitudeDeg: number; // 90 - |lat - dec|
  isAboveHorizon: boolean;
  visibility: StarVisibilityStatus;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Wrap hours into [0, 24) with 24h -> 0h, rounded to 1 decimal place.
 */
export function wrapHours(hours: number): number {
  const wrapped = ((hours % 24) + 24) % 24;
  const rounded = roundToOneDecimal(wrapped);
  return rounded >= 24 ? 0 : rounded;
}

/**
 * Format decimal hours into "XX ชม. YY น." (Thai) or "XXh YYm" (English / compact).
 */
export function formatHoursMinutes(
  hours: number,
  locale: Locale = 'th',
  signed = false
): string {
  const sign = signed ? (hours > 0.001 ? '+' : hours < -0.001 ? '−' : '') : '';
  const abs = Math.abs(hours);
  const totalMinutes = Math.round(abs * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (locale === 'th') {
    return `${sign}${h} ชม. ${String(m).padStart(2, '0')} น.`;
  }
  return `${sign}${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Compute Hour Angle H = LST - RA normalized into (-12h, +12h].
 */
export function computeHourAngle(lstHours: number, raHours: number): number {
  let h = ((lstHours - raHours) % 24 + 24) % 24;
  if (h > 12) h -= 24;
  return roundToOneDecimal(h);
}

/**
 * Maximum altitude at upper meridian transit: 90° - |lat - dec|.
 */
export function computeMaxMeridianAltitude(
  latitudeDeg: number,
  decDeg: number
): number {
  return roundToOneDecimal(90 - Math.abs(latitudeDeg - decDeg));
}

/**
 * Determine star rise/set visibility status at observer latitude.
 * Circumpolar when |Dec| > 90° - |lat| and Dec has the same sign as lat.
 * Never rises when |Dec| > 90° - |lat| and Dec has the opposite sign to lat.
 */
export function getVisibilityStatus(
  latitudeDeg: number,
  decDeg: number
): StarVisibilityStatus {
  const absLat = Math.abs(latitudeDeg);
  const absDec = Math.abs(decDeg);
  const threshold = 90 - absLat;

  if (absLat < 1e-6) {
    return 'rises-sets';
  }

  if (absDec > threshold + 1e-6) {
    const sameSign =
      (latitudeDeg > 0 && decDeg > 0) || (latitudeDeg < 0 && decDeg < 0);
    return sameSign ? 'circumpolar' : 'never-rises';
  }

  return 'rises-sets';
}

/**
 * Convert Equatorial coordinates (RA, Dec) + observer latitude & LST
 * to 3D Horizon Cartesian coordinates (X = East, Y = Zenith, Z = South)
 * and live Altitude/Azimuth.
 */
export function equatorialToHorizon(
  raHours: number,
  decDeg: number,
  latitudeDeg: number,
  lstHours: number
): { altitudeDeg: number; azimuthDeg: number; x: number; y: number; z: number } {
  const phi = latitudeDeg * DEG2RAD;
  const delta = decDeg * DEG2RAD;
  const H = computeHourAngle(lstHours, raHours) * 15 * DEG2RAD;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinDec = Math.sin(delta);
  const cosDec = Math.cos(delta);
  const sinH = Math.sin(H);
  const cosH = Math.cos(H);

  // Unit vector in Horizon frame (X=East, Y=Zenith, Z=South)
  const x = -cosDec * sinH;
  const y = sinPhi * sinDec + cosPhi * cosDec * cosH;
  const z = -cosPhi * sinDec + sinPhi * cosDec * cosH;

  const clampedY = Math.max(-1, Math.min(1, y));
  const altitudeDeg = roundToOneDecimal(Math.asin(clampedY) * RAD2DEG);

  // Azimuth clockwise from North (-Z) toward East (+X)
  const horiz = Math.hypot(x, z);
  const azimuthDeg =
    horiz < 1e-5 ? 0 : wrapAzimuth(Math.atan2(x, -z) * RAD2DEG);

  return { altitudeDeg, azimuthDeg, x, y, z };
}

/**
 * Compute full live Equatorial telemetry snapshot.
 */
export function computeEquatorialTelemetry(
  raHours: number,
  decDeg: number,
  latitudeDeg: number,
  lstHours: number,
  locale: Locale = 'th'
): EquatorialTelemetry {
  const ra = wrapHours(raHours);
  const dec = roundToOneDecimal(Math.max(-90, Math.min(90, decDeg)));
  const lat = roundToOneDecimal(Math.max(-90, Math.min(90, latitudeDeg)));
  const lst = wrapHours(lstHours);

  const hourAngleHours = computeHourAngle(lst, ra);
  const { altitudeDeg, azimuthDeg } = equatorialToHorizon(ra, dec, lat, lst);
  const compass = getCompassDirection(azimuthDeg, locale);
  const maxMeridianAltitudeDeg = computeMaxMeridianAltitude(lat, dec);
  const visibility = getVisibilityStatus(lat, dec);

  return {
    raHours: ra,
    decDeg: dec,
    latitudeDeg: lat,
    lstHours: lst,
    hourAngleHours,
    poleAltitudeDeg: lat,
    altitudeDeg,
    azimuthDeg,
    compassName: compass.name,
    compassCode: compass.code,
    maxMeridianAltitudeDeg,
    isAboveHorizon: altitudeDeg >= 0,
    visibility,
  };
}

/**
 * Local Celestial Sphere Cartesian coordinates inside the Equatorial spinning frame:
 *   +Y = NCP (Dec = +90°)
 *   +Z = Vernal Equinox (RA = 0h)
 *   +X = RA = 6h (East when LST = 0h)
 */
export function equatorialToLocalCartesian(
  raHours: number,
  decDeg: number,
  radius: number
): { x: number; y: number; z: number } {
  const raRad = raHours * 15 * DEG2RAD;
  const decRad = decDeg * DEG2RAD;
  const cosDec = Math.cos(decRad);
  return {
    x: radius * cosDec * Math.sin(raRad),
    y: radius * Math.sin(decRad),
    z: radius * cosDec * Math.cos(raRad),
  };
}

/**
 * Inverse conversion from Celestial Sphere local Cartesian coordinates back to (RA, Dec).
 */
export function localCartesianToEquatorial(
  x: number,
  y: number,
  z: number
): { ra: number; dec: number } {
  const r = Math.hypot(x, y, z) || 1;
  const clampedY = Math.max(-r, Math.min(r, y));
  const dec = roundToOneDecimal(Math.asin(clampedY / r) * RAD2DEG);
  const horiz = Math.hypot(x, z);
  const raDeg = horiz < 1e-4 ? 0 : ((Math.atan2(x, z) * RAD2DEG) + 360) % 360;
  const ra = wrapHours(raDeg / 15);
  return { ra, dec };
}
