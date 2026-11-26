import { MODULES, type ModuleDefinition } from '../data/modules';
import {
  computeZenithDistance,
  getCompassDirection,
  roundToOneDecimal,
  wrapAzimuth,
} from '../astronomy/horizon';
import {
  computeEquatorialTelemetry,
  formatHoursMinutes,
} from '../astronomy/equatorial';
import {
  computeEclipticTelemetry,
  dayOffsetToLambda,
  eclipticToEquatorial,
  lambdaToDayOffset,
} from '../astronomy/ecliptic';
import {
  calendarDayToDayOffset,
  calendarDayToSunLambda,
  computeSunMotionState,
  dayOffsetToCalendarDay,
  formatClockTime,
  formatSignedMinutesSeconds,
} from '../astronomy/sunMotion';
import { i18n } from '../i18n';
import { routeToHash } from '../router/router';
import { createSkyScene } from '../components/SkyScene';
import { createControlPanel } from '../components/ControlPanel';
import {
  createEarthMapPicker,
  type EarthMapPickerHandle,
} from '../components/EarthMapPicker';
import {
  createSunTimeControls,
  type SunTimeControlsHandle,
} from '../components/SunTimeControls';
import { createTryItButton } from '../components/TryItButton';
import { createQuizCard } from '../components/QuizCard';
import { ICONS } from '../components/Icons';
import {
  createCompareModuleWorkspace,
  type CompareWorkspaceHandle,
} from './CompareModuleWorkspace';
import type { PageHandle } from './HomePage';

function getAccentBadge(mod: ModuleDefinition): { cls: string; icon: string } {
  switch (mod.accent) {
    case 'horizon':
      return {
        cls: 'bg-horizon-soft text-horizon border-horizon-border',
        icon: ICONS.horizon('w-4 h-4'),
      };
    case 'equatorial':
      return {
        cls: 'bg-equatorial-soft text-equatorial border-equatorial-border',
        icon: ICONS.equatorial('w-4 h-4'),
      };
    case 'ecliptic':
      return {
        cls: 'bg-ecliptic-soft text-ecliptic border-ecliptic-border',
        icon: ICONS.ecliptic('w-4 h-4'),
      };
    case 'multi':
    default:
      return {
        cls: 'bg-subtle text-ink border-line-strong',
        icon: ICONS.compare('w-4 h-4'),
      };
  }
}

interface TelemetryHandle {
  element: HTMLElement;
  update: (values: Record<string, number>) => void;
}

function createHorizonLiveReadout(
  initialValues: Record<string, number>
): TelemetryHandle {
  const t = i18n.t().module;
  const section = document.createElement('section');
  section.className =
    'rounded-2xl border border-horizon-border/60 bg-surface p-4 sm:p-5 shadow-sm space-y-3';

  const heading = document.createElement('h2');
  heading.className = 'flex items-center gap-2 text-sm font-bold text-horizon';
  heading.innerHTML = `${ICONS.horizon('w-4 h-4 shrink-0')}<span>${t.liveReadoutTitle}</span>`;

  const grid = document.createElement('dl');
  grid.className = 'grid grid-cols-2 gap-2.5';

  const makeCard = (label: string, extraHint?: string) => {
    const card = document.createElement('div');
    card.className =
      'rounded-xl border border-line bg-subtle px-3 py-2.5 space-y-0.5';
    const dt = document.createElement('dt');
    dt.className = 'text-[11px] font-semibold text-ink-muted';
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.className = 'font-mono text-base sm:text-lg font-bold tabular-nums text-ink';
    card.append(dt, dd);
    if (extraHint) {
      const hint = document.createElement('p');
      hint.className = 'text-[11px] text-ink-muted';
      hint.textContent = extraHint;
      card.appendChild(hint);
    }
    return { card, dd };
  };

  const altCard = makeCard(t.altitudeLabel);
  const azCard = makeCard(t.azimuthLabel);
  const zenithCard = makeCard(t.zenithDistanceLabel, t.zenithFormula);
  const dirCard = makeCard(t.compassDirectionLabel);
  dirCard.dd.className =
    'text-sm sm:text-base font-bold text-horizon leading-snug';

  grid.append(altCard.card, azCard.card, zenithCard.card, dirCard.card);
  section.append(heading, grid);

  const update = (vals: Record<string, number>) => {
    const alt = roundToOneDecimal(vals.altitude ?? 45);
    const az = wrapAzimuth(vals.azimuth ?? 45);
    const zenithDist = computeZenithDistance(alt);
    const compass = getCompassDirection(az, i18n.getLocale());

    altCard.dd.textContent = `${alt.toFixed(1)}°`;
    azCard.dd.textContent = `${az.toFixed(1)}°`;
    zenithCard.dd.textContent = `${zenithDist.toFixed(1)}°`;
    dirCard.dd.textContent = `${compass.name} (${compass.code})`;
  };

  update(initialValues);
  return { element: section, update };
}

function createEquatorialLiveReadout(
  initialValues: Record<string, number>
): TelemetryHandle {
  const t = i18n.t().module;
  const locale = i18n.getLocale();

  const section = document.createElement('section');
  section.className =
    'rounded-2xl border border-equatorial-border/60 bg-surface p-4 sm:p-5 shadow-sm space-y-3';

  const heading = document.createElement('h2');
  heading.className = 'flex items-center gap-2 text-sm font-bold text-equatorial';
  heading.innerHTML = `${ICONS.equatorial('w-4 h-4 shrink-0')}<span>${t.equatorialReadoutTitle}</span>`;

  const grid = document.createElement('dl');
  grid.className = 'grid grid-cols-2 gap-2.5';

  const makeCard = (label: string, fullWidth = false) => {
    const card = document.createElement('div');
    card.className = `rounded-xl border border-line bg-subtle px-3 py-2.5 space-y-0.5 ${
      fullWidth ? 'col-span-2' : ''
    }`;
    const dt = document.createElement('dt');
    dt.className = 'text-[11px] font-semibold text-ink-muted';
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.className = 'font-mono text-sm sm:text-base font-bold tabular-nums text-ink';
    const sub = document.createElement('p');
    sub.className = 'text-[11px] text-ink-muted leading-snug';
    card.append(dt, dd, sub);
    return { card, dd, sub };
  };

  const hourAngleCard = makeCard(t.hourAngleLabel);
  const poleCard = makeCard(t.poleAltitudeLabel);
  const maxAltCard = makeCard(t.maxMeridianAltLabel);
  const statusCard = makeCard(t.visibilityStatusLabel);
  const horizonLinkCard = makeCard(t.liveAltAzLabel, true);

  grid.append(
    hourAngleCard.card,
    poleCard.card,
    maxAltCard.card,
    statusCard.card,
    horizonLinkCard.card
  );
  section.append(heading, grid);

  const update = (vals: Record<string, number>) => {
    const tel = computeEquatorialTelemetry(
      vals.ra ?? 6,
      vals.dec ?? 23.5,
      vals.latitude ?? 14,
      vals.lst ?? 8,
      locale
    );

    hourAngleCard.dd.textContent = formatHoursMinutes(
      tel.hourAngleHours,
      locale,
      true
    );
    hourAngleCard.sub.textContent = t.hourAngleFormula;

    const poleSign =
      tel.poleAltitudeDeg > 0 ? '+' : tel.poleAltitudeDeg < 0 ? '−' : '';
    poleCard.dd.textContent = `${poleSign}${Math.abs(tel.poleAltitudeDeg).toFixed(1)}°`;
    poleCard.sub.textContent =
      tel.poleAltitudeDeg > 0.05
        ? t.poleNorthHint
        : tel.poleAltitudeDeg < -0.05
          ? t.poleSouthHint
          : t.poleEquatorHint;

    maxAltCard.dd.textContent = `${tel.maxMeridianAltitudeDeg.toFixed(1)}°`;
    maxAltCard.sub.textContent = t.maxMeridianFormula;

    statusCard.dd.className = 'text-xs sm:text-sm font-bold leading-snug pt-0.5';
    if (tel.visibility === 'circumpolar') {
      statusCard.dd.innerHTML = `<span class="inline-flex items-center gap-1 rounded-lg border border-equatorial-border bg-equatorial-soft px-2 py-0.5 text-equatorial">${ICONS.check(
        'w-3.5 h-3.5 shrink-0'
      )}<span>${t.statusCircumpolar}</span></span>`;
    } else if (tel.visibility === 'never-rises') {
      statusCard.dd.innerHTML = `<span class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5" style="border-color: var(--feedback-error); background: var(--feedback-error-bg); color: var(--feedback-error)">${ICONS.cross(
        'w-3.5 h-3.5 shrink-0'
      )}<span>${t.statusNeverRises}</span></span>`;
    } else {
      statusCard.dd.innerHTML = `<span class="inline-flex items-center gap-1 rounded-lg border border-horizon-border bg-horizon-soft px-2 py-0.5 text-horizon">${ICONS.horizon(
        'w-3.5 h-3.5 shrink-0'
      )}<span>${t.statusRisesSets}</span></span>`;
    }
    const threshold = roundToOneDecimal(90 - Math.abs(tel.latitudeDeg));
    statusCard.sub.textContent =
      locale === 'th'
        ? `เกณฑ์ |Dec| > ${threshold.toFixed(1)}°`
        : `Threshold |Dec| > ${threshold.toFixed(1)}°`;

    const altSign = tel.altitudeDeg > 0 ? '+' : tel.altitudeDeg < 0 ? '−' : '';
    const altText = `${altSign}${Math.abs(tel.altitudeDeg).toFixed(1)}°`;
    const azText = `${tel.azimuthDeg.toFixed(1)}°`;
    const visBadge = tel.isAboveHorizon
      ? `<span class="inline-flex items-center gap-1 rounded-full border border-horizon-border bg-horizon-soft px-2 py-0.5 text-[11px] font-semibold text-horizon">${ICONS.check(
          'w-3 h-3 shrink-0'
        )}<span>${t.aboveHorizonTag}</span></span>`
      : `<span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold" style="border-color: var(--feedback-error); background: var(--feedback-error-bg); color: var(--feedback-error)">${ICONS.cross(
          'w-3 h-3 shrink-0'
        )}<span>${t.belowHorizonTag}</span></span>`;

    horizonLinkCard.dd.className =
      'flex flex-wrap items-center justify-between gap-2 pt-0.5';
    horizonLinkCard.dd.innerHTML = `
      <span class="font-mono text-sm sm:text-base font-bold tabular-nums text-ink">
        Alt ${altText} • Az ${azText}
      </span>
      ${visBadge}
    `;
    horizonLinkCard.sub.textContent = `${tel.compassName} (${tel.compassCode})`;
  };

  update(initialValues);
  return { element: section, update };
}

function createEclipticLiveReadout(
  initialValues: Record<string, number>,
  onSnapToSun: () => void
): TelemetryHandle {
  const t = i18n.t().module;
  const locale = i18n.getLocale();

  const section = document.createElement('section');
  section.className =
    'rounded-2xl border border-ecliptic-border/60 bg-surface p-4 sm:p-5 shadow-sm space-y-3';

  // Header + active object mode badge + snap-to-Sun button
  const headerRow = document.createElement('div');
  headerRow.className = 'flex flex-wrap items-center justify-between gap-2';

  const heading = document.createElement('h2');
  heading.className = 'flex items-center gap-2 text-sm font-bold text-ecliptic';
  heading.innerHTML = `${ICONS.ecliptic('w-4 h-4 shrink-0')}<span>${t.eclipticReadoutTitle}</span>`;

  const snapBtn = document.createElement('button');
  snapBtn.type = 'button';
  snapBtn.className =
    'hidden items-center gap-1 rounded-lg border border-ecliptic-border bg-ecliptic-soft px-2.5 py-1 text-[11px] font-semibold text-ecliptic hover:opacity-90';
  snapBtn.textContent = t.snapToSunBtn;
  snapBtn.addEventListener('click', onSnapToSun);

  headerRow.append(heading, snapBtn);
  section.appendChild(headerRow);

  const grid = document.createElement('dl');
  grid.className = 'grid grid-cols-2 gap-2.5';

  const makeCard = (label: string, fullWidth = false) => {
    const card = document.createElement('div');
    card.className = `rounded-xl border border-line bg-subtle px-3 py-2.5 space-y-0.5 ${
      fullWidth ? 'col-span-2' : ''
    }`;
    const dt = document.createElement('dt');
    dt.className = 'text-[11px] font-semibold text-ink-muted';
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.className = 'font-mono text-sm sm:text-base font-bold tabular-nums text-ink';
    const sub = document.createElement('p');
    sub.className = 'text-[11px] text-ink-muted leading-snug';
    card.append(dt, dd, sub);
    return { card, dd, sub };
  };

  const sm = t.sunMotions;
  const sunHorizonCard = makeCard(sm.sunAltAzLabel, true);
  const dayLengthCard = makeCard(sm.dayLengthLabel);
  const eotCard = makeCard(sm.eotLabel);
  const eqConvertCard = makeCard(t.eclipticConvertedLabel, true);
  const solarDecCard = makeCard(t.solarDecLabel);
  const noonAltCard = makeCard(t.noonSunAltLabel);
  const seasonCard = makeCard(t.seasonLabel, true);

  grid.append(
    sunHorizonCard.card,
    dayLengthCard.card,
    eotCard.card,
    eqConvertCard.card,
    solarDecCard.card,
    noonAltCard.card,
    seasonCard.card
  );
  section.appendChild(grid);

  // Mini SVG Annual Solar Declination Chart
  const chartBox = document.createElement('div');
  chartBox.className =
    'rounded-xl border border-line bg-subtle p-3 space-y-1.5';

  const chartHeader = document.createElement('div');
  chartHeader.className = 'flex items-center justify-between gap-2 text-[11px]';
  const chartTitle = document.createElement('span');
  chartTitle.className = 'font-semibold text-ink-secondary';
  chartTitle.textContent = t.solarDecChartTitle;
  const chartDatePill = document.createElement('span');
  chartDatePill.className =
    'font-mono font-bold text-ecliptic tabular-nums';
  chartHeader.append(chartTitle, chartDatePill);

  const chartHost = document.createElement('div');
  chartHost.className = 'w-full';
  chartBox.append(chartHeader, chartHost);
  section.appendChild(chartBox);

  const renderSolarDecChart = (
    lambdaDeg: number,
    obliquityDeg: number,
    solarDecDeg: number,
    dateLabel: string
  ) => {
    const w = 320;
    const h = 114;
    const padL = 34;
    const padR = 12;
    const padT = 12;
    const padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const midY = padT + plotH / 2;

    const maxScale = obliquityDeg > 32 ? 90 : 30;
    const mapX = (lam: number) => padL + (lam / 360) * plotW;
    const mapY = (dec: number) => midY - (dec / maxScale) * (plotH / 2);

    // Build curve path
    const pts: string[] = [];
    for (let lam = 0; lam <= 360; lam += 5) {
      const { decDeg } = eclipticToEquatorial(lam, 0, obliquityDeg);
      const x = mapX(lam).toFixed(1);
      const y = mapY(decDeg).toFixed(1);
      pts.push(`${lam === 0 ? 'M' : 'L'}${x},${y}`);
    }
    const pathD = pts.join(' ');

    const curX = mapX(lambdaDeg);
    const curY = mapY(solarDecDeg);
    const epsTopY = mapY(obliquityDeg);
    const epsBotY = mapY(-obliquityDeg);

    const xTicks =
      locale === 'th'
        ? [
            [0, '21 มี.ค.'],
            [90, '21 มิ.ย.'],
            [180, '23 ก.ย.'],
            [270, '22 ธ.ค.'],
            [360, '21 มี.ค.'],
          ]
        : [
            [0, 'Mar 21'],
            [90, 'Jun 21'],
            [180, 'Sep 23'],
            [270, 'Dec 22'],
            [360, 'Mar 21'],
          ];

    chartDatePill.textContent = `${dateLabel} (λ ${lambdaDeg.toFixed(1)}°)`;

    chartHost.innerHTML = `
      <svg role="img" aria-label="${t.solarDecChartTitle}" viewBox="0 0 ${w} ${h}" class="block h-auto w-full overflow-visible">
        <!-- Zero equator line -->
        <line x1="${padL}" y1="${midY}" x2="${w - padR}" y2="${midY}" stroke="var(--coord-equatorial)" stroke-width="1" stroke-dasharray="3 3" opacity="0.7" />
        <!-- +ε / -ε guide lines -->
        ${
          obliquityDeg >= 1
            ? `
          <line x1="${padL}" y1="${epsTopY}" x2="${w - padR}" y2="${epsTopY}" stroke="var(--border-strong)" stroke-width="0.9" stroke-dasharray="2 3" opacity="0.55" />
          <line x1="${padL}" y1="${epsBotY}" x2="${w - padR}" y2="${epsBotY}" stroke="var(--border-strong)" stroke-width="0.9" stroke-dasharray="2 3" opacity="0.55" />
          <text x="${padL - 4}" y="${epsTopY + 3}" text-anchor="end" fill="var(--text-muted)" font-size="9" font-family="JetBrains Mono, monospace">+${obliquityDeg.toFixed(0)}°</text>
          <text x="${padL - 4}" y="${epsBotY + 3}" text-anchor="end" fill="var(--text-muted)" font-size="9" font-family="JetBrains Mono, monospace">−${obliquityDeg.toFixed(0)}°</text>
        `
            : ''
        }
        <text x="${padL - 4}" y="${midY + 3}" text-anchor="end" fill="var(--text-muted)" font-size="9" font-family="JetBrains Mono, monospace">0°</text>

        <!-- Annual Solar Declination Sine Curve -->
        <path d="${pathD}" fill="none" stroke="var(--coord-ecliptic)" stroke-width="2.4" stroke-linecap="round" />

        <!-- Current date vertical guide + marker dot -->
        <line x1="${curX.toFixed(1)}" y1="${padT}" x2="${curX.toFixed(1)}" y2="${h - padB}" stroke="var(--coord-ecliptic)" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.75" />
        <circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="4.8" fill="var(--coord-ecliptic)" stroke="var(--bg-surface)" stroke-width="2" />

        <!-- X-axis seasonal labels -->
        ${xTicks
          .map(
            ([lam, lbl]) =>
              `<text x="${mapX(lam as number).toFixed(1)}" y="${h - 5}" text-anchor="middle" fill="var(--text-muted)" font-size="8.5" font-family="Noto Sans Thai, sans-serif">${lbl}</text>`
          )
          .join('')}
      </svg>
    `;
  };

  const update = (vals: Record<string, number>) => {
    const tel = computeEclipticTelemetry(
      vals.eclipticLon ?? 90,
      vals.eclipticLat ?? 0,
      vals.obliquity ?? 23.5,
      vals.latitude ?? 14,
      vals.dayOfYear,
      locale
    );

    const cDay =
      typeof vals.calendarDay === 'number'
        ? vals.calendarDay
        : dayOffsetToCalendarDay(vals.dayOfYear ?? 91);
    const sTime = typeof vals.solarTime === 'number' ? vals.solarTime : 12;
    const sunState = computeSunMotionState(
      cDay,
      sTime,
      vals.latitude ?? 14,
      vals.obliquity ?? 23.5,
      locale,
      vals.eclipticLon ?? 90
    );

    // Sun Horizon position + Zero-Shadow Day indicator
    const sAltSign =
      sunState.altitudeDeg > 0 ? '+' : sunState.altitudeDeg < 0 ? '−' : '';
    const sunVisBadge = sunState.isZeroShadowDay
      ? `<span class="inline-flex items-center gap-1 rounded-full border border-ecliptic-border bg-ecliptic px-2 py-0.5 text-[11px] font-bold text-ecliptic-contrast">${ICONS.sun('w-3 h-3 shrink-0')}<span>${sm.zeroShadowBadge}</span></span>`
      : sunState.altitudeDeg >= 0
        ? `<span class="inline-flex items-center gap-1 rounded-full border border-horizon-border bg-horizon-soft px-2 py-0.5 text-[11px] font-semibold text-horizon">${ICONS.check('w-3 h-3 shrink-0')}<span>${t.aboveHorizonTag}</span></span>`
        : `<span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold" style="border-color: var(--feedback-error); background: var(--feedback-error-bg); color: var(--feedback-error)">${ICONS.cross('w-3 h-3 shrink-0')}<span>${t.belowHorizonTag}</span></span>`;

    sunHorizonCard.dd.className =
      'flex flex-wrap items-center justify-between gap-2 pt-0.5';
    sunHorizonCard.dd.innerHTML = `
      <span class="font-mono text-sm sm:text-base font-bold tabular-nums text-ink">
        Alt ${sAltSign}${Math.abs(sunState.altitudeDeg).toFixed(1)}° • Az ${sunState.azimuthDeg.toFixed(1)}°
      </span>
      ${sunVisBadge}
    `;
    sunHorizonCard.sub.textContent = `${sunState.dateLabel} • ${sunState.clockLabel} • ${sunState.compassName} (${sunState.compassCode})`;

    if (sunState.daylightRegime === 'midnight-sun') {
      dayLengthCard.dd.textContent = '24.0 h';
      dayLengthCard.sub.textContent = sm.midnightSunTag;
    } else if (sunState.daylightRegime === 'polar-night') {
      dayLengthCard.dd.textContent = '0.0 h';
      dayLengthCard.sub.textContent = sm.polarNightTag;
    } else {
      const hWhole = Math.floor(sunState.dayLengthHours);
      const mRem = Math.round((sunState.dayLengthHours - hWhole) * 60);
      dayLengthCard.dd.textContent =
        locale === 'th' ? `${hWhole} ชม. ${mRem} น.` : `${hWhole}h ${mRem}m`;
      const sr = sunState.sunriseHours !== null ? formatClockTime(sunState.sunriseHours) : '--:--';
      const ss = sunState.sunsetHours !== null ? formatClockTime(sunState.sunsetHours) : '--:--';
      dayLengthCard.sub.textContent = `${sr} – ${ss}`;
    }

    eotCard.dd.textContent = formatSignedMinutesSeconds(sunState.equationOfTimeMin);
    eotCard.sub.textContent =
      locale === 'th'
        ? 'เวลาสุริยะปรากฏ − เวลาเฉลี่ย'
        : 'Apparent − Mean Solar Time';

    snapBtn.classList.toggle('hidden', tel.isOnEcliptic);
    snapBtn.classList.toggle('inline-flex', !tel.isOnEcliptic);

    const decSign = tel.decDeg > 0 ? '+' : tel.decDeg < 0 ? '−' : '';
    const raText = formatHoursMinutes(tel.raHours, locale);
    const decText = `${decSign}${Math.abs(tel.decDeg).toFixed(1)}°`;
    const modeTag = tel.isOnEcliptic
      ? `<span class="inline-flex items-center gap-1 rounded-full border border-ecliptic-border bg-ecliptic-soft px-2 py-0.5 text-[11px] font-semibold text-ecliptic">${ICONS.sun(
          'w-3 h-3 shrink-0'
        )}<span>${t.eclipticSunModeTag}</span></span>`
      : `<span class="inline-flex items-center gap-1 rounded-full border border-equatorial-border bg-equatorial-soft px-2 py-0.5 text-[11px] font-semibold text-equatorial">${ICONS.ecliptic(
          'w-3 h-3 shrink-0'
        )}<span>${t.eclipticTestObjTag}</span></span>`;

    eqConvertCard.dd.className =
      'flex flex-wrap items-center justify-between gap-2 pt-0.5';
    eqConvertCard.dd.innerHTML = `
      <span class="font-mono text-sm sm:text-base font-bold tabular-nums text-ink">
        RA ${raText} • Dec ${decText}
      </span>
      ${modeTag}
    `;
    eqConvertCard.sub.textContent = `λ = ${tel.lambdaDeg.toFixed(1)}°, β = ${
      tel.betaDeg > 0 ? '+' : tel.betaDeg < 0 ? '−' : ''
    }${Math.abs(tel.betaDeg).toFixed(1)}°, ε = ${tel.obliquityDeg.toFixed(1)}°`;

    const sunDecSign =
      tel.solarDecDeg > 0 ? '+' : tel.solarDecDeg < 0 ? '−' : '';
    solarDecCard.dd.textContent = `${sunDecSign}${Math.abs(tel.solarDecDeg).toFixed(1)}°`;
    solarDecCard.sub.textContent = `${tel.dateLabel} (β = 0°)`;

    noonAltCard.dd.textContent = `${tel.noonSunAltitudeDeg.toFixed(1)}°`;
    noonAltCard.sub.textContent = t.noonSunFormula;

    seasonCard.dd.className = 'text-sm sm:text-base font-bold text-ecliptic pt-0.5';
    seasonCard.dd.textContent = tel.seasonLabel;
    seasonCard.sub.textContent =
      locale === 'th'
        ? `ละติจูดผู้สังเกต ${tel.latitudeDeg >= 0 ? '+' : '−'}${Math.abs(tel.latitudeDeg).toFixed(1)}° • ความเอียงแกน ε = ${tel.obliquityDeg.toFixed(1)}°`
        : `Observer lat ${tel.latitudeDeg >= 0 ? '+' : '−'}${Math.abs(tel.latitudeDeg).toFixed(1)}° • Obliquity ε = ${tel.obliquityDeg.toFixed(1)}°`;

    renderSolarDecChart(
      tel.lambdaDeg,
      tel.obliquityDeg,
      tel.solarDecDeg,
      tel.dateLabel
    );
  };

  update(initialValues);
  return { element: section, update };
}

export function createModulePage(mod: ModuleDefinition): PageHandle {
  const t = i18n.t();
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:py-8';

  // =========================================================================
  // Breadcrumb & Header
  // =========================================================================
  const topHeader = document.createElement('div');
  topHeader.className = 'space-y-3';

  const breadcrumbNav = document.createElement('nav');
  breadcrumbNav.setAttribute('aria-label', 'Breadcrumb');
  breadcrumbNav.innerHTML = `
    <ol class="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-muted">
      <li>
        <a href="${routeToHash({ page: 'home' })}" class="inline-flex items-center gap-1 hover:text-ink transition-colors">
          ${ICONS.arrowLeft('w-3.5 h-3.5')}
          <span>${t.module.breadcrumbHome}</span>
        </a>
      </li>
      <li aria-hidden="true">/</li>
      <li aria-current="page" class="text-ink font-semibold">${i18n.pick(mod.shortTitle)}</li>
    </ol>
  `;

  const badgeInfo = getAccentBadge(mod);
  const moduleNumLabel =
    i18n.getLocale() === 'th' ? `โมดูลที่ ${mod.order}` : `Module ${mod.order}`;

  const titleRow = document.createElement('div');
  titleRow.className = 'space-y-2';
  titleRow.innerHTML = `
    <div class="flex flex-wrap items-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${badgeInfo.cls}">
        ${badgeInfo.icon}
        <span>${moduleNumLabel}</span>
      </span>
      <span class="text-xs font-medium text-ink-muted">${t.subjectBadge}</span>
    </div>
    <h1 id="main-heading" tabindex="-1" class="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
      ${i18n.pick(mod.title)}
    </h1>
    <p class="max-w-3xl text-sm sm:text-base text-ink-secondary leading-relaxed">
      ${i18n.pick(mod.subtitle)}
    </p>
  `;

  topHeader.append(breadcrumbNav, titleRow);

  if (!mod.isInteractiveReady) {
    const phaseBanner = document.createElement('p');
    phaseBanner.className =
      'rounded-xl border border-line bg-subtle px-4 py-2.5 text-xs text-ink-secondary leading-relaxed';
    phaseBanner.textContent = t.module.phaseNotice;
    topHeader.appendChild(phaseBanner);
  }

  container.appendChild(topHeader);

  // =========================================================================
  // Interactive Workspace (Compare uses unified 3-tab workspace; Modules 1-3 use standard)
  // =========================================================================
  let compareWorkspace: CompareWorkspaceHandle | null = null;
  let standardDispose: (() => void) | null = null;

  if (mod.id === 'compare') {
    compareWorkspace = createCompareModuleWorkspace(mod);
    container.appendChild(compareWorkspace.element);
  } else {
    const workspaceOuter = document.createElement('div');
    workspaceOuter.className = 'module-grid-container';

    const workspace = document.createElement('div');
    workspace.className = 'module-workspace-layout space-y-6 lg:space-y-0';

    const initialValues: Record<string, number> = {};
    for (const s of mod.sliders) {
      initialValues[s.id] = s.defaultValue;
    }
    if (mod.id === 'ecliptic') {
      initialValues.calendarDay = dayOffsetToCalendarDay(initialValues.dayOfYear ?? 91);
      initialValues.solarTime = 12;
    }

    let controlPanel!: ReturnType<typeof createControlPanel>;
    let skyScene!: ReturnType<typeof createSkyScene>;
    let tryItButton!: ReturnType<typeof createTryItButton>;
    let earthMapPicker: EarthMapPickerHandle | null = null;
    let sunTimeControls: SunTimeControlsHandle | null = null;

    // Extra Sun Motions state for Module 3 (not in ControlPanel sliders)
    let eclipticCalendarDay = initialValues.calendarDay ?? dayOffsetToCalendarDay(91);
    let eclipticSolarTime = initialValues.solarTime ?? 12;

    const getMergedValues = (base?: Record<string, number>): Record<string, number> => {
      const vals = base ? { ...base } : controlPanel.getValues();
      if (mod.id === 'ecliptic') {
        vals.calendarDay = eclipticCalendarDay;
        vals.solarTime = eclipticSolarTime;
      }
      return vals;
    };

    const syncSunClockReadout = (vals: Record<string, number>) => {
      if (mod.id !== 'ecliptic' || !sunTimeControls) return;
      const sunState = computeSunMotionState(
        eclipticCalendarDay,
        eclipticSolarTime,
        vals.latitude ?? 14,
        vals.obliquity ?? 23.5,
        i18n.getLocale(),
        vals.eclipticLon ?? 90
      );
      sunTimeControls.setState({
        calendarDay: eclipticCalendarDay,
        solarTime: eclipticSolarTime,
        sunriseHours: sunState.sunriseHours,
        sunsetHours: sunState.sunsetHours,
        daylightRegime: sunState.daylightRegime,
      });
    };

    if (mod.id === 'equatorial' || mod.id === 'ecliptic') {
      earthMapPicker = createEarthMapPicker({
        initialLatitude: initialValues.latitude ?? 14,
        onLatitudeChange: (nextLat) => {
          if (tryItButton.isPlaying()) {
            skyScene.stopDemo();
            tryItButton.setPlaying(false);
            tryItButton.setActiveStep(null);
          }
          controlPanel.setValues({ latitude: nextLat }, true);
          const synced = getMergedValues();
          skyScene.setParams(synced);
          liveReadout?.update(synced);
          syncSunClockReadout(synced);
        },
      });
    }

    if (mod.id === 'ecliptic') {
      sunTimeControls = createSunTimeControls({
        initialCalendarDay: eclipticCalendarDay,
        initialSolarTime: eclipticSolarTime,
        onChange: (patch) => {
          if (tryItButton.isPlaying()) {
            skyScene.stopDemo();
            tryItButton.setPlaying(false);
            tryItButton.setActiveStep(null);
          }
          if (typeof patch.calendarDay === 'number') {
            eclipticCalendarDay = patch.calendarDay;
            const nextOffset = calendarDayToDayOffset(eclipticCalendarDay);
            const nextLon = calendarDayToSunLambda(eclipticCalendarDay);
            controlPanel.setValues(
              { dayOfYear: nextOffset, eclipticLon: nextLon },
              true
            );
          }
          if (typeof patch.solarTime === 'number') {
            eclipticSolarTime = patch.solarTime;
          }
          const synced = getMergedValues();
          skyScene.setParams(synced);
          liveReadout?.update(synced);
          syncSunClockReadout(synced);
        },
        onAnimStateChange: (animState) => {
          if (animState.playing && tryItButton.isPlaying()) {
            tryItButton.setPlaying(false);
            tryItButton.setActiveStep(null);
          }
          skyScene.setSunAnimation(animState);
        },
      });
    }

    const liveReadout: TelemetryHandle | null =
      mod.id === 'horizon'
        ? createHorizonLiveReadout(initialValues)
        : mod.id === 'equatorial'
          ? createEquatorialLiveReadout(initialValues)
          : mod.id === 'ecliptic'
            ? createEclipticLiveReadout(initialValues, () => {
                controlPanel.setValues({ eclipticLat: 0 }, true);
                const synced = getMergedValues();
                skyScene.setParams(synced);
                liveReadout?.update(synced);
              })
            : null;

    controlPanel = createControlPanel({
      sliders: mod.sliders,
      initialValues,
      onChange: (nextValues, changedId) => {
        if (tryItButton.isPlaying()) {
          skyScene.stopDemo();
          tryItButton.setPlaying(false);
          tryItButton.setActiveStep(null);
        }
        if (changedId === 'lst') {
          skyScene.setSiderealPlaying(false);
        }

        const merged = getMergedValues(nextValues);
        if (mod.id === 'ecliptic') {
          if (changedId === 'dayOfYear') {
            const syncedLon = dayOffsetToLambda(merged.dayOfYear);
            merged.eclipticLon = syncedLon;
            eclipticCalendarDay = dayOffsetToCalendarDay(merged.dayOfYear);
            merged.calendarDay = eclipticCalendarDay;
            controlPanel.setValues({ eclipticLon: syncedLon }, true);
          } else if (changedId === 'eclipticLon') {
            const syncedDay = lambdaToDayOffset(merged.eclipticLon);
            merged.dayOfYear = syncedDay;
            eclipticCalendarDay = dayOffsetToCalendarDay(syncedDay);
            merged.calendarDay = eclipticCalendarDay;
            controlPanel.setValues({ dayOfYear: syncedDay }, true);
          } else if (
            changedId === 'eclipticLat' &&
            Math.abs(merged.eclipticLat ?? 0) >= 0.3
          ) {
            skyScene.setEclipticView('ecliptic');
          }
        }
        if (changedId === 'latitude' && typeof merged.latitude === 'number') {
          earthMapPicker?.setLatitude(merged.latitude);
        }

        skyScene.setParams(merged);
        liveReadout?.update(merged);
        syncSunClockReadout(merged);
      },
      onReset: (resetValues) => {
        skyScene.stopDemo();
        skyScene.setSiderealPlaying(false);
        if (mod.id === 'ecliptic') {
          skyScene.setSunAnimation({ playing: false, mode: 'continuous', speed: 1 });
          sunTimeControls?.setPlaying(false);
          eclipticCalendarDay = dayOffsetToCalendarDay(resetValues.dayOfYear ?? 91);
          eclipticSolarTime = 12;
        }
        tryItButton.setPlaying(false);
        tryItButton.setActiveStep(null);
        if (typeof resetValues.latitude === 'number') {
          earthMapPicker?.setLatitude(resetValues.latitude, 100.5);
        }
        const merged = getMergedValues(resetValues);
        skyScene.setParams(merged);
        liveReadout?.update(merged);
        syncSunClockReadout(merged);
      },
    });

    skyScene = createSkyScene({
      mode: mod.id,
      initialParams: initialValues,
      showLayerToggles: false,
      showControlsBar: true,
      onUserDrag: (draggedValues) => {
        if (tryItButton.isPlaying()) {
          tryItButton.setPlaying(false);
        }
        tryItButton.setActiveStep(null);
        const patch = { ...draggedValues };
        if (mod.id === 'ecliptic') {
          if (typeof patch.solarTime === 'number') {
            eclipticSolarTime = patch.solarTime;
            delete patch.solarTime;
          }
          if (typeof patch.eclipticLon === 'number') {
            patch.dayOfYear = lambdaToDayOffset(patch.eclipticLon);
            eclipticCalendarDay = dayOffsetToCalendarDay(patch.dayOfYear);
          }
        }
        if (Object.keys(patch).length > 0) {
          controlPanel.setValues(patch, true);
        }
        const synced = getMergedValues();
        liveReadout?.update(synced);
        syncSunClockReadout(synced);
      },
      onSiderealTick: (lstHours) => {
        controlPanel.setValues({ lst: lstHours }, true);
        liveReadout?.update(controlPanel.getValues());
      },
      onSunAnimTick: (tick) => {
        eclipticCalendarDay = tick.calendarDay;
        eclipticSolarTime = tick.solarTime;
        controlPanel.setValues(
          { eclipticLon: tick.eclipticLon, dayOfYear: tick.dayOfYear },
          true
        );
        const synced = getMergedValues();
        liveReadout?.update(synced);
        syncSunClockReadout(synced);
      },
    });

    syncSunClockReadout(initialValues);

    tryItButton = createTryItButton({
      accent: mod.accent,
      description: i18n.pick(mod.demoDescription),
      steps: mod.demoSteps,
      onToggle: (shouldPlay) => {
        if (shouldPlay) {
          if (mod.demoSteps && mod.demoSteps.length > 0) {
            skyScene.startSteppedDemo(
              mod.demoSteps,
              (animatedValues) => {
                const patch = { ...animatedValues };
                if (mod.id === 'ecliptic') {
                  if (
                    typeof patch.eclipticLon === 'number' &&
                    typeof patch.dayOfYear !== 'number'
                  ) {
                    patch.dayOfYear = lambdaToDayOffset(patch.eclipticLon);
                  }
                  if (typeof patch.dayOfYear === 'number') {
                    eclipticCalendarDay = dayOffsetToCalendarDay(patch.dayOfYear);
                  }
                }
                controlPanel.setValues(patch, true);
                if (typeof patch.latitude === 'number') {
                  earthMapPicker?.setLatitude(patch.latitude);
                }
                const synced = getMergedValues();
                liveReadout?.update(synced);
                syncSunClockReadout(synced);
              },
              (stepIdx) => {
                tryItButton.setActiveStep(stepIdx);
              },
              () => {
                tryItButton.setPlaying(false);
              }
            );
          } else {
            skyScene.startDemo(
              (animatedValues) => {
                controlPanel.setValues(animatedValues, true);
                if (typeof animatedValues.latitude === 'number') {
                  earthMapPicker?.setLatitude(animatedValues.latitude);
                }
                const synced = getMergedValues();
                liveReadout?.update(synced);
                syncSunClockReadout(synced);
              },
              () => {
                tryItButton.setPlaying(false);
              }
            );
          }
        } else {
          skyScene.stopDemo();
          tryItButton.setActiveStep(null);
        }
      },
      onSelectStep: (stepIndex) => {
        const step = mod.demoSteps?.[stepIndex];
        if (!step) return;
        if (step.waypoints || step.sweep) {
          tryItButton.setPlaying(true);
          skyScene.startSteppedDemo(
            [step],
            (vals) => {
              const patch = { ...vals };
              if (mod.id === 'ecliptic') {
                if (
                  typeof patch.eclipticLon === 'number' &&
                  typeof patch.dayOfYear !== 'number'
                ) {
                  patch.dayOfYear = lambdaToDayOffset(patch.eclipticLon);
                }
                if (typeof patch.dayOfYear === 'number') {
                  eclipticCalendarDay = dayOffsetToCalendarDay(patch.dayOfYear);
                }
              }
              controlPanel.setValues(patch, true);
              if (typeof patch.latitude === 'number') {
                earthMapPicker?.setLatitude(patch.latitude);
              }
              const synced = getMergedValues();
              liveReadout?.update(synced);
              syncSunClockReadout(synced);
            },
            () => {
              tryItButton.setActiveStep(stepIndex);
            },
            () => {
              tryItButton.setPlaying(false);
            }
          );
        } else {
          tryItButton.setPlaying(false);
          skyScene.animateToValues(step.values, (vals) => {
            if (mod.id === 'ecliptic' && typeof vals.dayOfYear === 'number') {
              eclipticCalendarDay = dayOffsetToCalendarDay(vals.dayOfYear);
            }
            controlPanel.setValues(vals, true);
            if (typeof vals.latitude === 'number') {
              earthMapPicker?.setLatitude(vals.latitude);
            }
            const synced = getMergedValues();
            liveReadout?.update(synced);
            syncSunClockReadout(synced);
          });
        }
      },
    });

    const sceneCol = document.createElement('div');
    sceneCol.className = 'space-y-4 min-w-0';

    const actionCard = document.createElement('div');
    actionCard.className =
      'rounded-2xl border border-line bg-surface p-4 shadow-sm';
    actionCard.appendChild(tryItButton.element);

    sceneCol.appendChild(skyScene.element);
    if (sunTimeControls) {
      sceneCol.appendChild(sunTimeControls.element);
    }
    if (earthMapPicker) {
      sceneCol.appendChild(earthMapPicker.element);
    }
    sceneCol.appendChild(actionCard);

    const sideCol = document.createElement('div');
    sideCol.className = 'space-y-4 min-w-0';

    if (liveReadout) {
      sideCol.appendChild(liveReadout.element);
    }

    const objectivesCard = document.createElement('section');
    objectivesCard.className =
      'rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm space-y-3';
    const objTitle = document.createElement('h2');
    objTitle.className = 'text-base font-semibold text-ink';
    objTitle.textContent = t.module.learningObjectives;

    const objList = document.createElement('ul');
    objList.className = 'space-y-2 text-sm text-ink-secondary list-disc pl-5';
    for (const obj of mod.objectives) {
      const li = document.createElement('li');
      li.className = 'leading-relaxed';
      li.textContent = i18n.pick(obj);
      objList.appendChild(li);
    }
    objectivesCard.append(objTitle, objList);

    sideCol.append(controlPanel.element, objectivesCard);

    workspace.append(sceneCol, sideCol);
    workspaceOuter.appendChild(workspace);
    container.appendChild(workspaceOuter);

    standardDispose = () => {
      skyScene.dispose();
      controlPanel.destroy();
      earthMapPicker?.destroy();
      sunTimeControls?.destroy();
    };
  }

  // =========================================================================
  // Key Concepts Grid
  // =========================================================================
  const conceptsSection = document.createElement('section');
  conceptsSection.className = 'space-y-4';

  const conceptsTitle = document.createElement('h2');
  conceptsTitle.className = 'text-xl font-bold text-ink';
  conceptsTitle.textContent = t.module.keyConcepts;

  const conceptsGrid = document.createElement('div');
  conceptsGrid.className = 'grid grid-cols-1 gap-4 md:grid-cols-3';

  for (const item of mod.concepts) {
    const card = document.createElement('article');
    card.className =
      'rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2';
    const h3 = document.createElement('h3');
    h3.className = 'text-base font-bold text-ink';
    h3.textContent = i18n.pick(item.term);

    const p = document.createElement('p');
    p.className = 'text-sm text-ink-secondary leading-relaxed';
    p.textContent = i18n.pick(item.detail);

    card.append(h3, p);
    conceptsGrid.appendChild(card);
  }

  conceptsSection.append(conceptsTitle, conceptsGrid);
  container.appendChild(conceptsSection);

  // =========================================================================
  // QuizCard (4 questions, instant grading)
  // =========================================================================
  const quizCard = createQuizCard({
    questions: mod.quiz,
    accent: mod.accent,
  });
  container.appendChild(quizCard.element);

  // =========================================================================
  // Previous / Next Module Navigation
  // =========================================================================
  const currentIdx = MODULES.findIndex((m) => m.id === mod.id);
  const prevMod = currentIdx > 0 ? MODULES[currentIdx - 1] : null;
  const nextMod = currentIdx < MODULES.length - 1 ? MODULES[currentIdx + 1] : null;

  const pager = document.createElement('nav');
  pager.setAttribute('aria-label', 'Module pagination');
  pager.className =
    'flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6';

  const prevLink = document.createElement('a');
  prevLink.href = prevMod
    ? routeToHash({ page: 'module', moduleId: prevMod.id })
    : routeToHash({ page: 'home' });
  prevLink.className =
    'inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-line-strong hover:bg-subtle transition-colors';
  prevLink.innerHTML = `${ICONS.arrowLeft('w-4 h-4')}<span>${
    prevMod ? `${t.module.prevModule}: ${i18n.pick(prevMod.shortTitle)}` : t.module.backHome
  }</span>`;

  pager.appendChild(prevLink);

  if (nextMod) {
    const nextLink = document.createElement('a');
    nextLink.href = routeToHash({ page: 'module', moduleId: nextMod.id });
    nextLink.className =
      'inline-flex items-center gap-2 rounded-xl bg-equatorial px-4 py-2.5 text-sm font-semibold text-equatorial-contrast shadow-sm hover:opacity-95 transition-opacity';
    nextLink.innerHTML = `<span>${t.module.nextModule}: ${i18n.pick(nextMod.shortTitle)}</span>${ICONS.arrowRight('w-4 h-4')}`;
    pager.appendChild(nextLink);
  } else {
    const homeLink = document.createElement('a');
    homeLink.href = routeToHash({ page: 'home' });
    homeLink.className =
      'inline-flex items-center gap-2 rounded-xl bg-equatorial px-4 py-2.5 text-sm font-semibold text-equatorial-contrast shadow-sm hover:opacity-95 transition-opacity';
    homeLink.innerHTML = `<span>${t.module.backHome}</span>${ICONS.arrowRight('w-4 h-4')}`;
    pager.appendChild(homeLink);
  }

  container.appendChild(pager);

  return {
    element: container,
    dispose: () => {
      compareWorkspace?.dispose();
      standardDispose?.();
    },
  };
}
