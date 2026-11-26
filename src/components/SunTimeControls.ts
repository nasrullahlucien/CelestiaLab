import {
  calendarDayToMonthDay,
  formatCalendarDate,
  formatClockTime,
  MONTH_DAYS,
  MONTH_NAMES_EN,
  MONTH_NAMES_TH,
  monthDayToCalendarDay,
  wrapCalendarDay,
  type DaylightRegime,
} from '../astronomy/sunMotion';
import { wrapHours } from '../astronomy/equatorial';
import { i18n } from '../i18n';
import { ICONS } from './Icons';

export type SunAnimMode = 'continuous' | 'step-by-day';

export interface SunTimeControlsOptions {
  initialCalendarDay: number;
  initialSolarTime: number;
  onChange: (patch: { calendarDay?: number; solarTime?: number }) => void;
  onAnimStateChange: (state: {
    playing: boolean;
    mode: SunAnimMode;
    speed: number;
  }) => void;
}

export interface SunTimeControlsHandle {
  element: HTMLElement;
  setState: (next: {
    calendarDay?: number;
    solarTime?: number;
    sunriseHours?: number | null;
    sunsetHours?: number | null;
    daylightRegime?: DaylightRegime;
  }) => void;
  setPlaying: (playing: boolean) => void;
  destroy: () => void;
}

const CLOCK_SIZE = 164;
const CLOCK_CX = CLOCK_SIZE / 2;
const CLOCK_CY = CLOCK_SIZE / 2;
const CLOCK_R = 66;

/** Convert 24-hour clock time (0=top, 6=right, 12=bottom, 18=left) to SVG point. */
function clockHourToXY(hours: number, radius: number): { x: number; y: number } {
  const rad = ((hours / 24) * Math.PI * 2) - Math.PI / 2;
  return {
    x: CLOCK_CX + Math.cos(rad) * radius,
    y: CLOCK_CY + Math.sin(rad) * radius,
  };
}

function describeDaylightSector(
  sunrise: number | null,
  sunset: number | null,
  regime: DaylightRegime
): string {
  if (regime === 'polar-night') return '';
  if (regime === 'midnight-sun' || sunrise === null || sunset === null) {
    return `M ${CLOCK_CX} ${CLOCK_CY - CLOCK_R} A ${CLOCK_R} ${CLOCK_R} 0 1 1 ${CLOCK_CX - 0.01} ${CLOCK_CY - CLOCK_R} Z`;
  }
  const span = (sunset - sunrise + 24) % 24;
  if (span <= 0.05) return '';
  if (span >= 23.95) {
    return `M ${CLOCK_CX} ${CLOCK_CY - CLOCK_R} A ${CLOCK_R} ${CLOCK_R} 0 1 1 ${CLOCK_CX - 0.01} ${CLOCK_CY - CLOCK_R} Z`;
  }
  const start = clockHourToXY(sunrise, CLOCK_R);
  const end = clockHourToXY(sunset, CLOCK_R);
  const largeArc = span > 12 ? 1 : 0;
  return `M ${CLOCK_CX} ${CLOCK_CY} L ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${CLOCK_R} ${CLOCK_R} 0 ${largeArc} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)} Z`;
}

export function createSunTimeControls(
  options: SunTimeControlsOptions
): SunTimeControlsHandle {
  const t = i18n.t().module;
  const sm = t.sunMotions;
  const locale = i18n.getLocale();
  const monthNames = locale === 'th' ? MONTH_NAMES_TH : MONTH_NAMES_EN;

  let calendarDay = wrapCalendarDay(options.initialCalendarDay);
  let solarTime = wrapHours(options.initialSolarTime);
  let sunriseHours: number | null = 6;
  let sunsetHours: number | null = 18;
  let daylightRegime: DaylightRegime = 'normal';

  let animPlaying = false;
  let animMode: SunAnimMode = 'continuous';
  let animSpeed = 1;

  const section = document.createElement('section');
  section.className =
    'rounded-2xl border border-ecliptic-border/60 bg-surface p-4 sm:p-5 shadow-sm space-y-4';

  // Header
  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-center justify-between gap-2';
  const heading = document.createElement('h2');
  heading.className = 'flex items-center gap-2 text-sm font-bold text-ecliptic';
  heading.innerHTML = `${ICONS.sun('w-4 h-4 shrink-0')}<span>${sm.cardTitle}</span>`;

  const liveBadge = document.createElement('span');
  liveBadge.className =
    'rounded-lg border border-ecliptic-border bg-ecliptic-soft px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-ecliptic';

  header.append(heading, liveBadge);
  section.appendChild(header);

  // =========================================================================
  // 1) 12-Month Calendar Timeline Bar + Day/Month Inputs
  // =========================================================================
  const calBlock = document.createElement('div');
  calBlock.className = 'space-y-2';

  const calHeader = document.createElement('div');
  calHeader.className = 'flex flex-wrap items-center justify-between gap-2 text-xs';

  const calLbl = document.createElement('span');
  calLbl.className = 'font-semibold text-ink-secondary';
  calLbl.textContent = sm.calendarLabel;

  const calPickers = document.createElement('div');
  calPickers.className = 'flex items-center gap-1.5';

  const dayInput = document.createElement('input');
  dayInput.type = 'number';
  dayInput.min = '1';
  dayInput.max = '31';
  dayInput.dataset.sunDayInput = 'true';
  dayInput.setAttribute('aria-label', sm.calendarLabel);
  dayInput.className =
    'w-14 rounded-lg border border-line bg-subtle px-2 py-1 text-center font-mono text-xs font-bold tabular-nums text-ink focus:border-ecliptic focus:outline-none';

  const monthSelect = document.createElement('select');
  monthSelect.dataset.sunMonthSelect = 'true';
  monthSelect.setAttribute('aria-label', sm.calendarLabel);
  monthSelect.className =
    'rounded-lg border border-line bg-subtle px-2 py-1 text-xs font-semibold text-ink focus:border-ecliptic focus:outline-none';
  monthNames.forEach((mName, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = mName;
    monthSelect.appendChild(opt);
  });

  calPickers.append(dayInput, monthSelect);
  calHeader.append(calLbl, calPickers);

  // Interactive 12-month horizontal bar
  const timelineWrap = document.createElement('div');
  timelineWrap.dataset.sunCalendarBar = 'true';
  timelineWrap.className =
    'relative select-none cursor-ew-resize rounded-xl border border-line bg-subtle px-1 py-2';
  timelineWrap.style.touchAction = 'none';

  const monthsGrid = document.createElement('div');
  monthsGrid.className = 'grid grid-cols-12 divide-x divide-line/80 text-center';
  for (let m = 0; m < 12; m++) {
    const cell = document.createElement('span');
    cell.className =
      'px-0.5 py-1 text-[10px] sm:text-[11px] font-semibold text-ink-secondary truncate pointer-events-none';
    cell.textContent = monthNames[m];
    monthsGrid.appendChild(cell);
  }

  const pointerMarker = document.createElement('div');
  pointerMarker.className =
    'pointer-events-none absolute top-0 bottom-0 w-1 -ml-0.5 rounded-full bg-ecliptic shadow-sm';
  const pointerKnob = document.createElement('div');
  pointerKnob.className =
    'absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-surface bg-ecliptic shadow';
  pointerMarker.appendChild(pointerKnob);

  timelineWrap.append(monthsGrid, pointerMarker);
  calBlock.append(calHeader, timelineWrap);

  // =========================================================================
  // 2) Interactive 24-Hour Clock Dial + Quick Time Buttons
  // =========================================================================
  const clockRow = document.createElement('div');
  clockRow.className =
    'flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-line bg-subtle/60 p-3';

  const clockWrap = document.createElement('div');
  clockWrap.className = 'shrink-0';

  const tickMarks: string[] = [];
  for (let h = 0; h < 24; h++) {
    const isMajor = h % 3 === 0;
    const p1 = clockHourToXY(h, CLOCK_R - (isMajor ? 7 : 4));
    const p2 = clockHourToXY(h, CLOCK_R);
    tickMarks.push(
      `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="var(--text-muted)" stroke-width="${isMajor ? 1.5 : 0.9}" opacity="${isMajor ? 0.85 : 0.5}" />`
    );
    if (h % 6 === 0) {
      const lp = clockHourToXY(h, CLOCK_R - 17);
      const label = h === 0 ? '00' : h === 6 ? '06' : h === 12 ? '12' : '18';
      tickMarks.push(
        `<text x="${lp.x.toFixed(1)}" y="${(lp.y + 3).toFixed(1)}" text-anchor="middle" fill="var(--text-primary)" font-size="10" font-weight="700" font-family="JetBrains Mono, monospace">${label}</text>`
      );
    }
  }

  clockWrap.innerHTML = `
    <svg data-sun-clock-svg role="img" aria-label="${sm.clockLabel}" viewBox="0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}" width="144" height="144" class="block select-none cursor-pointer" style="touch-action: none;">
      <circle cx="${CLOCK_CX}" cy="${CLOCK_CY}" r="${CLOCK_R}" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="1.5" />
      <path data-daylight-sector d="" fill="var(--coord-ecliptic)" opacity="0.22" />
      ${tickMarks.join('')}
      <text x="${CLOCK_CX}" y="${CLOCK_CY - 22}" text-anchor="middle" fill="var(--text-muted)" font-size="8.5" font-family="Noto Sans Thai, sans-serif">${sm.quickMidnight}</text>
      <text x="${CLOCK_CX}" y="${CLOCK_CY + 28}" text-anchor="middle" fill="var(--coord-ecliptic)" font-size="8.5" font-weight="700" font-family="Noto Sans Thai, sans-serif">${sm.quickNoon}</text>
      <line data-clock-hand x1="${CLOCK_CX}" y1="${CLOCK_CY}" x2="${CLOCK_CX}" y2="${CLOCK_CY + 50}" stroke="var(--coord-ecliptic)" stroke-width="3.2" stroke-linecap="round" />
      <circle data-clock-tip cx="${CLOCK_CX}" cy="${CLOCK_CY + 50}" r="5.5" fill="var(--coord-ecliptic)" stroke="var(--bg-surface)" stroke-width="1.8" />
      <circle cx="${CLOCK_CX}" cy="${CLOCK_CY}" r="3.5" fill="var(--text-primary)" />
    </svg>
  `;

  const clockSvg = clockWrap.querySelector<SVGSVGElement>('[data-sun-clock-svg]')!;
  const daylightSectorPath = clockWrap.querySelector<SVGPathElement>('[data-daylight-sector]')!;
  const clockHand = clockWrap.querySelector<SVGLineElement>('[data-clock-hand]')!;
  const clockTip = clockWrap.querySelector<SVGCircleElement>('[data-clock-tip]')!;

  const clockSide = document.createElement('div');
  clockSide.className = 'flex-1 w-full space-y-2.5';

  const clockTitleRow = document.createElement('div');
  clockTitleRow.className = 'flex items-center justify-between gap-2';
  const clockLbl = document.createElement('span');
  clockLbl.className = 'text-xs font-semibold text-ink-secondary';
  clockLbl.textContent = sm.clockLabel;
  const clockReadout = document.createElement('span');
  clockReadout.className = 'font-mono text-base font-bold tabular-nums text-ink';
  clockTitleRow.append(clockLbl, clockReadout);

  // Quick time jump pills
  const quickGrid = document.createElement('div');
  quickGrid.className = 'grid grid-cols-2 gap-1.5';

  const makeQuickBtn = (label: string, action: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.sunQuickTime = action;
    b.className =
      'rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-ink-secondary hover:border-ecliptic-border hover:text-ecliptic transition-colors';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  };

  quickGrid.append(
    makeQuickBtn(sm.quickSunrise, 'sunrise', () => {
      solarTime = sunriseHours ?? 6;
      updateVisuals();
      options.onChange({ solarTime });
    }),
    makeQuickBtn(sm.quickNoon, 'noon', () => {
      solarTime = 12;
      updateVisuals();
      options.onChange({ solarTime });
    }),
    makeQuickBtn(sm.quickSunset, 'sunset', () => {
      solarTime = sunsetHours ?? 18;
      updateVisuals();
      options.onChange({ solarTime });
    }),
    makeQuickBtn(sm.quickMidnight, 'midnight', () => {
      solarTime = 0;
      updateVisuals();
      options.onChange({ solarTime });
    })
  );

  clockSide.append(clockTitleRow, quickGrid);
  clockRow.append(clockWrap, clockSide);

  // =========================================================================
  // 3) Animation Controls: Play/Pause + Continuous / Step-by-Day + Speed
  // =========================================================================
  const animBar = document.createElement('div');
  animBar.className =
    'flex flex-col gap-2 rounded-xl border border-line bg-subtle/50 p-3';

  const animTopRow = document.createElement('div');
  animTopRow.className = 'flex flex-wrap items-center justify-between gap-2';

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.dataset.action = 'toggle-sun-anim';

  const speedGroup = document.createElement('div');
  speedGroup.className = 'flex items-center gap-1';
  const speedBtns = new Map<number, HTMLButtonElement>();
  for (const spd of [0.5, 1, 2, 4]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.sunAnimSpeed = String(spd);
    b.textContent = `${spd}×`;
    b.addEventListener('click', () => {
      animSpeed = spd;
      renderAnimControls();
      options.onAnimStateChange({ playing: animPlaying, mode: animMode, speed: animSpeed });
    });
    speedBtns.set(spd, b);
    speedGroup.appendChild(b);
  }

  animTopRow.append(playBtn, speedGroup);

  const modeRow = document.createElement('div');
  modeRow.className = 'grid grid-cols-2 gap-1.5';
  modeRow.setAttribute('role', 'group');

  const modeBtns = new Map<SunAnimMode, HTMLButtonElement>();
  for (const [m, lbl] of [
    ['continuous', sm.animContinuous],
    ['step-by-day', sm.animStepByDay],
  ] as Array<[SunAnimMode, string]>) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.sunAnimMode = m;
    b.textContent = lbl;
    b.addEventListener('click', () => {
      animMode = m;
      renderAnimControls();
      options.onAnimStateChange({ playing: animPlaying, mode: animMode, speed: animSpeed });
    });
    modeBtns.set(m, b);
    modeRow.appendChild(b);
  }

  playBtn.addEventListener('click', () => {
    animPlaying = !animPlaying;
    renderAnimControls();
    options.onAnimStateChange({ playing: animPlaying, mode: animMode, speed: animSpeed });
  });

  const renderAnimControls = () => {
    playBtn.setAttribute('aria-pressed', String(animPlaying));
    if (animPlaying) {
      playBtn.className =
        'inline-flex items-center gap-1.5 rounded-lg border border-ecliptic-border bg-ecliptic text-ecliptic-contrast px-3 py-1.5 text-xs font-bold shadow-sm transition-colors';
      playBtn.innerHTML = `${ICONS.stop('w-3.5 h-3.5 shrink-0')}<span>${sm.animPause}</span>`;
    } else {
      playBtn.className =
        'inline-flex items-center gap-1.5 rounded-lg border border-ecliptic-border bg-ecliptic-soft text-ecliptic px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity';
      playBtn.innerHTML = `${ICONS.play('w-3.5 h-3.5 shrink-0')}<span>${sm.animPlay}</span>`;
    }

    for (const [spd, b] of speedBtns.entries()) {
      const on = animSpeed === spd;
      b.setAttribute('aria-pressed', String(on));
      b.className = on
        ? 'rounded-md border border-ecliptic-border bg-ecliptic text-ecliptic-contrast px-2 py-1 text-[11px] font-mono font-bold tabular-nums'
        : 'rounded-md border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink px-2 py-1 text-[11px] font-mono font-semibold tabular-nums';
    }

    for (const [m, b] of modeBtns.entries()) {
      const on = animMode === m;
      b.setAttribute('aria-pressed', String(on));
      b.className = on
        ? 'rounded-lg border border-ecliptic-border bg-ecliptic-soft text-ecliptic px-2.5 py-1.5 text-[11px] font-bold transition-colors'
        : 'rounded-lg border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink px-2.5 py-1.5 text-[11px] font-medium transition-colors';
    }
  };

  animBar.append(animTopRow, modeRow);
  section.append(calBlock, clockRow, animBar);

  // =========================================================================
  // Visual Updates & Pointer Interactions
  // =========================================================================
  const updateVisuals = () => {
    const { monthIndex, dayOfMonth } = calendarDayToMonthDay(calendarDay);
    dayInput.max = String(MONTH_DAYS[monthIndex]);
    dayInput.value = String(dayOfMonth);
    monthSelect.value = String(monthIndex);

    const pct = ((calendarDay - 1) / 364) * 100;
    pointerMarker.style.left = `${Math.max(1, Math.min(99, pct)).toFixed(2)}%`;

    const dateStr = formatCalendarDate(calendarDay, locale);
    const clockStr = formatClockTime(solarTime);
    liveBadge.textContent = `${dateStr} • ${clockStr}`;
    clockReadout.textContent = clockStr;

    daylightSectorPath.setAttribute(
      'd',
      describeDaylightSector(sunriseHours, sunsetHours, daylightRegime)
    );

    const tip = clockHourToXY(solarTime, CLOCK_R - 14);
    clockHand.setAttribute('x2', tip.x.toFixed(1));
    clockHand.setAttribute('y2', tip.y.toFixed(1));
    clockTip.setAttribute('cx', tip.x.toFixed(1));
    clockTip.setAttribute('cy', tip.y.toFixed(1));
  };

  const applyMonthDayInputs = () => {
    const m = Number(monthSelect.value) || 0;
    const d = Number(dayInput.value) || 1;
    calendarDay = monthDayToCalendarDay(m, d);
    updateVisuals();
    options.onChange({ calendarDay });
  };
  monthSelect.addEventListener('change', applyMonthDayInputs);
  dayInput.addEventListener('change', applyMonthDayInputs);

  // Dragging 12-month timeline
  let draggingCal = false;
  const pickCalFromClient = (clientX: number) => {
    const rect = timelineWrap.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    calendarDay = wrapCalendarDay(1 + Math.round(ratio * 364));
    updateVisuals();
    options.onChange({ calendarDay });
  };

  const onCalDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    draggingCal = true;
    timelineWrap.setPointerCapture(e.pointerId);
    pickCalFromClient(e.clientX);
  };
  const onCalMove = (e: PointerEvent) => {
    if (!draggingCal) return;
    pickCalFromClient(e.clientX);
  };
  const onCalEnd = (e: PointerEvent) => {
    if (!draggingCal) return;
    draggingCal = false;
    try {
      timelineWrap.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };
  timelineWrap.addEventListener('pointerdown', onCalDown);
  timelineWrap.addEventListener('pointermove', onCalMove);
  timelineWrap.addEventListener('pointerup', onCalEnd);
  timelineWrap.addEventListener('pointercancel', onCalEnd);

  // Dragging 24-hour clock dial
  let draggingClock = false;
  const pickClockFromClient = (clientX: number, clientY: number) => {
    const rect = clockSvg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Angle clockwise from top (12am = 0h)
    const rad = Math.atan2(clientX - cx, -(clientY - cy));
    const norm = (rad + Math.PI * 2) % (Math.PI * 2);
    solarTime = wrapHours(Math.round((norm / (Math.PI * 2)) * 24 * 12) / 12); // 5-min steps
    updateVisuals();
    options.onChange({ solarTime });
  };

  const onClockDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    draggingClock = true;
    clockSvg.setPointerCapture(e.pointerId);
    pickClockFromClient(e.clientX, e.clientY);
  };
  const onClockMove = (e: PointerEvent) => {
    if (!draggingClock) return;
    pickClockFromClient(e.clientX, e.clientY);
  };
  const onClockEnd = (e: PointerEvent) => {
    if (!draggingClock) return;
    draggingClock = false;
    try {
      clockSvg.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };
  clockSvg.addEventListener('pointerdown', onClockDown);
  clockSvg.addEventListener('pointermove', onClockMove);
  clockSvg.addEventListener('pointerup', onClockEnd);
  clockSvg.addEventListener('pointercancel', onClockEnd);

  renderAnimControls();
  updateVisuals();

  return {
    element: section,
    setState: (next) => {
      if (typeof next.calendarDay === 'number') {
        calendarDay = wrapCalendarDay(next.calendarDay);
      }
      if (typeof next.solarTime === 'number') {
        solarTime = wrapHours(next.solarTime);
      }
      if (next.sunriseHours !== undefined) sunriseHours = next.sunriseHours;
      if (next.sunsetHours !== undefined) sunsetHours = next.sunsetHours;
      if (next.daylightRegime !== undefined) daylightRegime = next.daylightRegime;
      updateVisuals();
    },
    setPlaying: (playing) => {
      animPlaying = playing;
      renderAnimControls();
    },
    destroy: () => {
      timelineWrap.removeEventListener('pointerdown', onCalDown);
      timelineWrap.removeEventListener('pointermove', onCalMove);
      timelineWrap.removeEventListener('pointerup', onCalEnd);
      timelineWrap.removeEventListener('pointercancel', onCalEnd);
      clockSvg.removeEventListener('pointerdown', onClockDown);
      clockSvg.removeEventListener('pointermove', onClockMove);
      clockSvg.removeEventListener('pointerup', onClockEnd);
      clockSvg.removeEventListener('pointercancel', onClockEnd);
    },
  };
}
