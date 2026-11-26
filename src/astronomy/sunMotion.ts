import { eclipticToEquatorial } from './ecliptic';
import { getCompassDirection, roundToOneDecimal, wrapAzimuth } from './horizon';
import { wrapHours } from './equatorial';
import type { Locale } from '../i18n';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export const MONTH_NAMES_TH = [
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
] as const;

export const MONTH_NAMES_EN = [
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
] as const;

/** Vernal equinox (March 21) is day 80 of a 365-day year (1-indexed: Jan 1 = 1). */
export const VERNAL_EQUINOX_DAY = 80;

export function wrapCalendarDay(day: number): number {
  const n = Math.round(day);
  return ((((n - 1) % 365) + 365) % 365) + 1;
}

/** Convert Module 3 dayOffset (0..365 days since Mar 21) to calendarDay (1..365, Jan 1 = 1). */
export function dayOffsetToCalendarDay(dayOffset: number): number {
  return wrapCalendarDay(Math.round(dayOffset) + VERNAL_EQUINOX_DAY);
}

/** Convert calendarDay (1..365, Jan 1 = 1) to Module 3 dayOffset (0..364 days since Mar 21). */
export function calendarDayToDayOffset(calendarDay: number): number {
  const c = wrapCalendarDay(calendarDay);
  return (c - VERNAL_EQUINOX_DAY + 365) % 365;
}

/** Convert calendarDay (1..365) into { monthIndex (0..11), dayOfMonth (1..31) }. */
export function calendarDayToMonthDay(calendarDay: number): {
  monthIndex: number;
  dayOfMonth: number;
} {
  let rem = wrapCalendarDay(calendarDay);
  for (let m = 0; m < 12; m++) {
    if (rem <= MONTH_DAYS[m]) {
      return { monthIndex: m, dayOfMonth: rem };
    }
    rem -= MONTH_DAYS[m];
  }
  return { monthIndex: 11, dayOfMonth: 31 };
}

/** Convert { monthIndex (0..11), dayOfMonth (1..31) } to calendarDay (1..365). */
export function monthDayToCalendarDay(monthIndex: number, dayOfMonth: number): number {
  const m = Math.max(0, Math.min(11, Math.floor(monthIndex)));
  const d = Math.max(1, Math.min(MONTH_DAYS[m], Math.floor(dayOfMonth)));
  let sum = 0;
  for (let i = 0; i < m; i++) {
    sum += MONTH_DAYS[i];
  }
  return sum + d;
}

export function formatCalendarDate(calendarDay: number, locale: Locale): string {
  const { monthIndex, dayOfMonth } = calendarDayToMonthDay(calendarDay);
  return locale === 'th'
    ? `${dayOfMonth} ${MONTH_NAMES_TH[monthIndex]}`
    : `${dayOfMonth} ${MONTH_NAMES_EN[monthIndex]}`;
}

/**
 * Equation of Time (minutes): Apparent Solar Time − Mean Solar Time.
 * Standard astronomical approximation (accurate within ~0.5 min, yields classic figure-8 analemma).
 */
export function computeEquationOfTimeMinutes(calendarDay: number): number {
  const n = wrapCalendarDay(calendarDay);
  const b = ((2 * Math.PI) / 365) * (n - 81);
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** Solar ecliptic longitude λ (0..360°) for a calendar day (1..365). */
export function calendarDayToSunLambda(calendarDay: number): number {
  const offset = calendarDayToDayOffset(calendarDay);
  return wrapAzimuth((offset * 360) / 365.2422);
}

export function formatClockTime(hours: number): string {
  const wrapped = wrapHours(hours);
  const totalMin = Math.round(wrapped * 60) % (24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatSignedMinutesSeconds(minutes: number): string {
  const sign = minutes > 0.01 ? '+' : minutes < -0.01 ? '−' : '';
  const totalSec = Math.round(Math.abs(minutes) * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${sign}${m}:${String(s).padStart(2, '0')}`;
}

export type DaylightRegime = 'normal' | 'midnight-sun' | 'polar-night';

export interface SunHorizonState {
  calendarDay: number;
  dateLabel: string;
  solarTimeHours: number;
  clockLabel: string;
  lambdaDeg: number;
  sunRaHours: number;
  sunDecDeg: number;
  equationOfTimeMin: number;
  hourAngleHours: number;
  lstHours: number;
  altitudeDeg: number;
  azimuthDeg: number;
  compassName: string;
  compassCode: string;
  noonAltitudeDeg: number;
  daylightRegime: DaylightRegime;
  dayLengthHours: number;
  sunriseHours: number | null;
  sunsetHours: number | null;
  isZeroShadowDay: boolean;
  /** Shadow length per 1 unit height when Sun is above horizon, null when below. */
  shadowRatio: number | null;
  shadowAzimuthDeg: number;
}

/**
 * Full-precision equatorial -> horizon conversion for solar position & analemma curves.
 */
export function exactEquatorialToHorizon(
  raHours: number,
  decDeg: number,
  latitudeDeg: number,
  lstHours: number
): { altitudeDeg: number; azimuthDeg: number; hourAngleHours: number } {
  let hHours = (lstHours - raHours) % 24;
  if (hHours > 12) hHours -= 24;
  if (hHours < -12) hHours += 24;

  const phi = Math.max(-90, Math.min(90, latitudeDeg)) * DEG2RAD;
  const dec = Math.max(-90, Math.min(90, decDeg)) * DEG2RAD;
  const H = hHours * 15 * DEG2RAD;

  const sinAlt = Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(phi) * Math.cos(H);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const y = -Math.cos(dec) * Math.sin(H);
  const x = Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.sin(phi) * Math.cos(H);
  let azDeg = Math.atan2(y, x) * RAD2DEG;
  if (azDeg < 0) azDeg += 360;

  return {
    altitudeDeg: altRad * RAD2DEG,
    azimuthDeg: azDeg % 360,
    hourAngleHours: hHours,
  };
}

/**
 * Computes full Sun Motions state for a given date, clock time, latitude, and obliquity.
 */
export function computeSunMotionState(
  calendarDay: number,
  solarTimeHours: number,
  latitudeDeg: number,
  obliquityDeg = 23.5,
  locale: Locale = 'th',
  overrideLambdaDeg?: number
): SunHorizonState {
  const cDay = wrapCalendarDay(calendarDay);
  const timeH = wrapHours(solarTimeHours);
  const lat = Math.max(-90, Math.min(90, latitudeDeg));
  const eps = Math.max(0, Math.min(90, obliquityDeg));

  const lambdaDeg =
    typeof overrideLambdaDeg === 'number'
      ? wrapAzimuth(overrideLambdaDeg)
      : calendarDayToSunLambda(cDay);

  const { raHours: sunRaHours, decDeg: sunDecDeg } = eclipticToEquatorial(
    lambdaDeg,
    0,
    eps
  );

  const eotMin = computeEquationOfTimeMinutes(cDay);
  // Apparent Solar Time = Mean Clock Time + EoT
  const apparentHourAngleHours = timeH - 12 + eotMin / 60;
  const lstHours = wrapHours(sunRaHours + apparentHourAngleHours);

  const { altitudeDeg, azimuthDeg, hourAngleHours } = exactEquatorialToHorizon(
    sunRaHours,
    sunDecDeg,
    lat,
    lstHours
  );

  const compass = getCompassDirection(azimuthDeg, locale);
  const noonAltitudeDeg = Math.max(-90, Math.min(90, 90 - Math.abs(lat - sunDecDeg)));
  const isZeroShadowDay = Math.abs(lat - sunDecDeg) <= 1.2 && noonAltitudeDeg >= 88.8;

  // Day length & sunrise/sunset times
  const phiRad = lat * DEG2RAD;
  const decRad = sunDecDeg * DEG2RAD;
  const cosH0 = -Math.tan(phiRad) * Math.tan(decRad);

  let daylightRegime: DaylightRegime = 'normal';
  let dayLengthHours = 12;
  let sunriseHours: number | null = null;
  let sunsetHours: number | null = null;

  if (!Number.isFinite(cosH0) || cosH0 <= -1) {
    daylightRegime = 'midnight-sun';
    dayLengthHours = 24;
  } else if (cosH0 >= 1) {
    daylightRegime = 'polar-night';
    dayLengthHours = 0;
  } else {
    const h0Hours = (Math.acos(cosH0) * RAD2DEG) / 15;
    dayLengthHours = 2 * h0Hours;
    sunriseHours = wrapHours(12 - h0Hours - eotMin / 60);
    sunsetHours = wrapHours(12 + h0Hours - eotMin / 60);
  }

  const shadowRatio =
    altitudeDeg > 0.5 ? 1 / Math.tan(altitudeDeg * DEG2RAD) : null;
  const shadowAzimuthDeg = wrapAzimuth(azimuthDeg + 180);

  return {
    calendarDay: cDay,
    dateLabel: formatCalendarDate(cDay, locale),
    solarTimeHours: timeH,
    clockLabel: formatClockTime(timeH),
    lambdaDeg: roundToOneDecimal(lambdaDeg),
    sunRaHours,
    sunDecDeg: roundToOneDecimal(sunDecDeg),
    equationOfTimeMin: eotMin,
    hourAngleHours,
    lstHours,
    altitudeDeg: roundToOneDecimal(altitudeDeg),
    azimuthDeg: roundToOneDecimal(azimuthDeg),
    compassName: compass.name,
    compassCode: compass.code,
    noonAltitudeDeg: roundToOneDecimal(noonAltitudeDeg),
    daylightRegime,
    dayLengthHours: roundToOneDecimal(dayLengthHours),
    sunriseHours,
    sunsetHours,
    isZeroShadowDay,
    shadowRatio,
    shadowAzimuthDeg,
  };
}

/**
 * Generates 3D horizon-frame points for the annual Analemma (figure-8)
 * at a fixed mean clock time, observer latitude, and obliquity.
 */
export function computeAnalemmaPoints(
  solarTimeHours: number,
  latitudeDeg: number,
  obliquityDeg: number,
  radius: number,
  stepDays = 5
): Array<{ x: number; y: number; z: number; aboveHorizon: boolean }> {
  const pts: Array<{ x: number; y: number; z: number; aboveHorizon: boolean }> = [];
  for (let d = 1; d <= 366; d += stepDays) {
    const day = d > 365 ? 1 : d;
    const lam = calendarDayToSunLambda(day);
    const { raHours, decDeg } = eclipticToEquatorial(lam, 0, obliquityDeg);
    const eotMin = computeEquationOfTimeMinutes(day);
    const lst = wrapHours(raHours + (solarTimeHours - 12) + eotMin / 60);
    const { altitudeDeg, azimuthDeg } = exactEquatorialToHorizon(
      raHours,
      decDeg,
      latitudeDeg,
      lst
    );
    const altR = altitudeDeg * DEG2RAD;
    const azR = azimuthDeg * DEG2RAD;
    const cosAlt = Math.cos(altR);
    pts.push({
      x: radius * cosAlt * Math.sin(azR),
      y: radius * Math.sin(altR),
      z: -radius * cosAlt * Math.cos(azR),
      aboveHorizon: altitudeDeg >= 0,
    });
  }
  return pts;
}
