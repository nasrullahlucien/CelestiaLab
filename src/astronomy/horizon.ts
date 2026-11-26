import type { Locale } from '../i18n';

export interface HorizonCoords {
  altitude: number; // 0..90 deg (dome upper hemisphere)
  azimuth: number; // 0..360 deg (360 wraps to 0)
}

export interface CompassDirectionInfo {
  code: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  th: string;
  en: string;
}

const COMPASS_8: CompassDirectionInfo[] = [
  { code: 'N', th: 'ทิศเหนือ', en: 'North' },
  { code: 'NE', th: 'ตะวันออกเฉียงเหนือ', en: 'Northeast' },
  { code: 'E', th: 'ทิศตะวันออก', en: 'East' },
  { code: 'SE', th: 'ตะวันออกเฉียงใต้', en: 'Southeast' },
  { code: 'S', th: 'ทิศใต้', en: 'South' },
  { code: 'SW', th: 'ตะวันตกเฉียงใต้', en: 'Southwest' },
  { code: 'W', th: 'ทิศตะวันตก', en: 'West' },
  { code: 'NW', th: 'ตะวันตกเฉียงเหนือ', en: 'Northwest' },
];

export function roundToOneDecimal(val: number): number {
  const rounded = Math.round(val * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Wrap azimuth 360° -> 0° and keep within [0, 360).
 */
export function wrapAzimuth(deg: number): number {
  const wrapped = ((deg % 360) + 360) % 360;
  const rounded = roundToOneDecimal(wrapped);
  return rounded >= 360 ? 0 : rounded;
}

/**
 * Compute Zenith distance z = 90° - Altitude.
 */
export function computeZenithDistance(altitudeDeg: number): number {
  return roundToOneDecimal(Math.max(0, Math.min(180, 90 - altitudeDeg)));
}

/**
 * Resolve 8-point compass direction name from azimuth [0, 360).
 */
export function getCompassDirection(
  azimuthDeg: number,
  locale: Locale = 'th'
): { name: string; code: CompassDirectionInfo['code'] } {
  const normalized = wrapAzimuth(azimuthDeg);
  const index = Math.floor(((normalized + 22.5) % 360) / 45);
  const entry = COMPASS_8[index] ?? COMPASS_8[0];
  return {
    name: locale === 'th' ? entry.th : entry.en,
    code: entry.code,
  };
}

/**
 * Convert Altitude & Azimuth (degrees) to 3D Cartesian coordinates on a sphere of radius R.
 * Scene convention:
 *   North = -Z (Az = 0°)
 *   East  = +X (Az = 90°)
 *   South = +Z (Az = 180°)
 *   West  = -X (Az = 270°)
 *   Zenith = +Y (Alt = +90°)
 *   Nadir  = -Y (Alt = -90°)
 */
export function horizonToCartesian(
  altitudeDeg: number,
  azimuthDeg: number,
  radius: number
): { x: number; y: number; z: number } {
  const altRad = (altitudeDeg * Math.PI) / 180;
  const azRad = (azimuthDeg * Math.PI) / 180;
  const cosAlt = Math.cos(altRad);
  return {
    x: radius * cosAlt * Math.sin(azRad),
    y: radius * Math.sin(altRad),
    z: -radius * cosAlt * Math.cos(azRad),
  };
}

/**
 * Convert 3D point on the celestial dome back into Altitude (clamped 0°–90°) and Azimuth (0°–359.9°).
 */
export function cartesianToHorizon(
  x: number,
  y: number,
  z: number
): HorizonCoords {
  const r = Math.hypot(x, y, z) || 1;
  const clampedY = Math.max(0, Math.min(r, y));
  const altRad = Math.asin(clampedY / r);
  const altDeg = roundToOneDecimal((altRad * 180) / Math.PI);

  // Preserve sensible azimuth even near zenith
  const horiz = Math.hypot(x, z);
  const azDeg =
    horiz < 1e-4 ? 0 : wrapAzimuth((Math.atan2(x, -z) * 180) / Math.PI);

  return {
    altitude: Math.max(0, Math.min(90, altDeg)),
    azimuth: azDeg,
  };
}
