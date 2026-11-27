import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { themeManager, type SceneThemePalette } from '../theme/themeManager';
import type { CoordAccent, DemoStepSpec, ModuleId } from '../data/modules';
import {
  cartesianToHorizon,
  horizonToCartesian,
  roundToOneDecimal,
  wrapAzimuth,
} from '../astronomy/horizon';
import {
  equatorialToLocalCartesian,
  formatHoursMinutes,
  localCartesianToEquatorial,
  wrapHours,
} from '../astronomy/equatorial';
import {
  eclipticToLocalCartesian,
  localCartesianToEcliptic,
} from '../astronomy/ecliptic';
import {
  calendarDayToDayOffset,
  calendarDayToSunLambda,
  computeEquationOfTimeMinutes,
  computeSunMotionState,
  dayOffsetToCalendarDay,
  wrapCalendarDay,
} from '../astronomy/sunMotion';
import {
  CONSTELLATIONS,
  type CatalogStar,
  type ConstellationId,
} from '../astronomy/patterns';
import {
  createCompassDiskTexture,
  createGlassSphereMaterial,
  createSphereGraticuleGeometry,
  SpaceViewController,
  StarPatternLayer,
  StarTrailLayer,
  updateGlassSpherePalette,
  ZoneCapsLayer,
  type GlassSphereUniforms,
  type StarTrailMode,
} from './RotatingSkyExtras';
import { SunMotionLayer } from './SunMotionLayer';
import type { SunAnimMode } from './SunTimeControls';
import { i18n } from '../i18n';
import { ICONS } from './Icons';

export type SkySceneMode = ModuleId | 'hero';

export type HorizonHelperKey =
  | 'meridian'
  | 'altitudeCircle'
  | 'altitudeArc'
  | 'azimuthArc'
  | 'zenithNadir';

export type EquatorialHelperKey =
  | 'celestialEquator'
  | 'polarAxis'
  | 'horizonMeridian'
  | 'decCircle'
  | 'raDecArcs';

export type EclipticHelperKey =
  | 'eclipticRing'
  | 'celestialEquator'
  | 'polesAxes'
  | 'seasonalPoints'
  | 'coordArcs';

export type EclipticViewMode = 'ecliptic' | 'sunpath';

export interface SkySceneOptions {
  mode: SkySceneMode;
  initialParams?: Record<string, number>;
  heightClass?: string;
  showLayerToggles?: boolean;
  showControlsBar?: boolean;
  onUserDrag?: (values: Record<string, number>) => void;
  onSiderealTick?: (lstHours: number) => void;
  onSunAnimTick?: (patch: {
    calendarDay: number;
    solarTime: number;
    eclipticLon: number;
    dayOfYear: number;
  }) => void;
  onEclipticViewChange?: (view: EclipticViewMode) => void;
  onLockChange?: (locked: boolean) => void;
}

export interface SkySceneHandle {
  element: HTMLElement;
  setParams: (params: Record<string, number>) => void;
  setLayerVisibility: (layer: CoordAccent, visible: boolean) => void;
  setHorizonHelperVisibility: (helper: HorizonHelperKey, visible: boolean) => void;
  setEquatorialHelperVisibility: (helper: EquatorialHelperKey, visible: boolean) => void;
  setEclipticHelperVisibility: (helper: EclipticHelperKey, visible: boolean) => void;
  setCompareFocus: (focus: CoordAccent | null) => void;
  setSiderealPlaying: (playing: boolean) => void;
  setEclipticView: (view: EclipticViewMode) => void;
  setCoordsLocked: (locked: boolean) => void;
  isCoordsLocked: () => boolean;
  setSunAnimation: (state: {
    playing: boolean;
    mode: SunAnimMode;
    speed: number;
  }) => void;
  startDemo: (
    onValues: (values: Record<string, number>) => void,
    onDone: () => void
  ) => void;
  startSteppedDemo: (
    steps: DemoStepSpec[],
    onValues: (values: Record<string, number>) => void,
    onStepChange: (stepIndex: number | null) => void,
    onDone: () => void
  ) => void;
  animateToValues: (
    targetValues: Record<string, number>,
    onValues: (values: Record<string, number>) => void,
    onDone?: () => void
  ) => void;
  stopDemo: () => void;
  resetCamera: () => void;
  dispose: () => void;
}

const SPHERE_RADIUS = 3.2;

function createCircleGeometry(radius: number, segments = 128): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius)
    );
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function createTextSprite(
  text: string,
  fgHex: string,
  bgHex: string,
  scale = 0.42,
  wide = false
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = wide ? 300 : 140;
  canvas.height = 76;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Sleek semi-translucent micro-pill with crisp subtle border
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(10, 12, canvas.width - 20, 52, 20);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = fgHex;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = fgHex;
    ctx.font = wide
      ? '700 24px "JetBrains Mono", "Noto Sans Thai", system-ui, sans-serif'
      : '700 30px "JetBrains Mono", "Noto Sans Thai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(scale * aspect * 0.78, scale * 0.78, 1);
  return sprite;
}

function updateTextSprite(
  sprite: THREE.Sprite,
  text: string,
  fgHex: string,
  bgHex: string,
  wide = false
): void {
  const mat = sprite.material as THREE.SpriteMaterial;
  const oldMap = mat.map;
  const replacement = createTextSprite(text, fgHex, bgHex, 0.42, wide);
  const newMat = replacement.material as THREE.SpriteMaterial;
  mat.map = newMat.map;
  mat.needsUpdate = true;
  oldMap?.dispose();
  newMat.dispose();
}

function hexNumberToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

export function createSkyScene(options: SkySceneOptions): SkySceneHandle {
  const {
    mode,
    heightClass = mode === 'hero'
      ? 'h-[320px] sm:h-[380px] lg:h-[420px]'
      : 'h-[360px] sm:h-[440px] lg:h-[500px]',
    showLayerToggles = mode === 'compare',
    showControlsBar = mode !== 'hero',
    onUserDrag,
    onSiderealTick,
    onSunAnimTick,
    onEclipticViewChange,
    onLockChange,
  } = options;

  const params: Record<string, number> = {
    altitude: 45,
    azimuth: 45,
    ra: 6,
    dec: 23.5,
    latitude: 14,
    eclipticLon: 90,
    eclipticLat: 0,
    obliquity: mode === 'compare' ? 23.44 : 23.5,
    dayOfYear: 91,
    calendarDay: dayOffsetToCalendarDay(91),
    solarTime: 12,
    lst: 8,
    sunLambda: 90,
    ...options.initialParams,
  };

  const t = i18n.t();
  const isThai = i18n.getLocale() === 'th';

  const wrapper = document.createElement('div');
  wrapper.className =
    'relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm';

  let siderealPlayBtn: HTMLButtonElement | null = null;
  const speedButtons = new Map<number, HTMLButtonElement>();
  let siderealPlaying = false;
  let siderealSpeed = 1;

  const renderSiderealControls = () => {
    if (!siderealPlayBtn) return;
    const sp = i18n.t().module.siderealPlayback;
    siderealPlayBtn.setAttribute('aria-pressed', String(siderealPlaying));
    if (siderealPlaying) {
      siderealPlayBtn.className =
        'inline-flex items-center gap-1.5 rounded-lg border border-equatorial-border bg-equatorial text-equatorial-contrast px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors';
      siderealPlayBtn.innerHTML = `${ICONS.stop('w-3.5 h-3.5 shrink-0')}<span>${sp.pause}</span>`;
    } else {
      siderealPlayBtn.className =
        'inline-flex items-center gap-1.5 rounded-lg border border-equatorial-border bg-equatorial-soft text-equatorial px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity';
      siderealPlayBtn.innerHTML = `${ICONS.play('w-3.5 h-3.5 shrink-0')}<span>${sp.play}</span>`;
    }

    for (const [spd, btn] of speedButtons.entries()) {
      const active = siderealSpeed === spd;
      btn.setAttribute('aria-pressed', String(active));
      btn.className = active
        ? 'inline-flex items-center justify-center rounded-md border border-equatorial-border bg-equatorial text-equatorial-contrast px-2 py-1 text-[11px] font-mono font-bold tabular-nums'
        : 'inline-flex items-center justify-center rounded-md border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink px-2 py-1 text-[11px] font-mono font-semibold tabular-nums';
    }
  };

  const isRotatingSkyMode = mode === 'equatorial' || mode === 'compare';
  let dualView = false;
  let trailMode: StarTrailMode = 'none';
  let activeConstellation: ConstellationId = 'none';
  let zoneCapsEnabled = false;
  let extraStars: CatalogStar[] = [];

  let dualViewSingleBtn: HTMLButtonElement | null = null;
  let dualViewSplitBtn: HTMLButtonElement | null = null;
  let sphereGridVisible = mode === 'hero';
  let sphereGridBtn: HTMLButtonElement | null = null;
  let hideUnderside = false;
  let hideUndersideBtn: HTMLButtonElement | null = null;
  let coordsLocked = false;
  let lockCoordsBtn: HTMLButtonElement | null = null;
  let lockedOverlayBadge: HTMLDivElement | null = null;
  let isCssFullscreen = false;
  let isNativeFullscreen = false;
  let fullscreenBtn: HTMLButtonElement | null = null;
  let captureBtn: HTMLButtonElement | null = null;
  let captureFeedbackTimer: number | null = null;

  let eclipticView: EclipticViewMode = 'sunpath';
  let ecViewEclipticBtn: HTMLButtonElement | null = null;
  let ecViewSunPathBtn: HTMLButtonElement | null = null;
  let sunShadowEnabled = true;
  let sunAnalemmaEnabled = false;
  let sunMonthsEnabled = false;
  let sunAnimPlaying = false;
  let sunAnimMode: SunAnimMode = 'continuous';
  let sunAnimSpeed = 1;
  let sunDayAccum = 0;

  const trailButtons = new Map<StarTrailMode, HTMLButtonElement>();
  const constellationButtons = new Map<ConstellationId, HTMLButtonElement>();
  let constellationHintEl: HTMLParagraphElement | null = null;
  let zoneCapsBtn: HTMLButtonElement | null = null;
  let clearStarsBtn: HTMLButtonElement | null = null;
  let randomCountBadge: HTMLSpanElement | null = null;

  let spaceOverlayBadge: HTMLDivElement | null = null;
  let horizonOverlayBadge: HTMLDivElement | null = null;
  let dualDividerEl: HTMLDivElement | null = null;

  const renderDualViewButtons = () => {
    if (!dualViewSingleBtn || !dualViewSplitBtn) return;
    dualViewSingleBtn.setAttribute('aria-pressed', String(!dualView));
    dualViewSplitBtn.setAttribute('aria-pressed', String(dualView));
    const activeCls =
      'inline-flex items-center rounded-md border border-equatorial-border bg-equatorial text-equatorial-contrast px-2.5 py-1 text-[11px] font-bold shadow-sm transition-colors';
    const idleCls =
      'inline-flex items-center rounded-md border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink px-2.5 py-1 text-[11px] font-medium transition-colors';
    dualViewSingleBtn.className = !dualView ? activeCls : idleCls;
    dualViewSplitBtn.className = dualView ? activeCls : idleCls;

    if (spaceOverlayBadge && horizonOverlayBadge && dualDividerEl) {
      spaceOverlayBadge.classList.toggle('hidden', !dualView);
      horizonOverlayBadge.classList.toggle('hidden', !dualView);
      dualDividerEl.classList.toggle('hidden', !dualView);
    }
  };

  const renderExplorerToolbar = () => {
    if (!isRotatingSkyMode) return;
    const rs = i18n.t().module.rotatingSky;

    const pillActive =
      'inline-flex items-center rounded-md border border-equatorial-border bg-equatorial text-equatorial-contrast px-2 py-0.5 text-[11px] font-bold transition-colors';
    const pillIdle =
      'inline-flex items-center rounded-md border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink px-2 py-0.5 text-[11px] font-medium transition-colors';

    for (const [m, btn] of trailButtons.entries()) {
      const on = trailMode === m;
      btn.setAttribute('aria-pressed', String(on));
      btn.className = on ? pillActive : pillIdle;
    }

    for (const [cid, btn] of constellationButtons.entries()) {
      const on = activeConstellation === cid;
      btn.setAttribute('aria-pressed', String(on));
      btn.className = on ? pillActive : pillIdle;
    }

    if (constellationHintEl) {
      if (activeConstellation !== 'none') {
        constellationHintEl.textContent = i18n.pick(
          CONSTELLATIONS[activeConstellation].hint
        );
        constellationHintEl.className =
          'block text-[11px] text-equatorial font-medium leading-snug';
      } else {
        constellationHintEl.textContent = '';
        constellationHintEl.className = 'hidden';
      }
    }

    if (zoneCapsBtn) {
      zoneCapsBtn.setAttribute('aria-pressed', String(zoneCapsEnabled));
      zoneCapsBtn.className = zoneCapsEnabled
        ? 'inline-flex items-center rounded-lg border border-equatorial-border bg-equatorial text-equatorial-contrast px-2.5 py-1 text-[11px] font-bold shadow-sm transition-colors'
        : 'inline-flex items-center rounded-lg border border-equatorial-border bg-equatorial-soft px-2.5 py-1 text-[11px] font-semibold text-equatorial hover:opacity-90 transition-opacity';
    }

    if (clearStarsBtn && randomCountBadge) {
      const hasExtra = extraStars.length > 0;
      clearStarsBtn.className = hasExtra
        ? 'inline-flex items-center rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors'
        : 'hidden';
      randomCountBadge.className = hasExtra
        ? 'inline-flex items-center text-[11px] font-medium text-ink-muted'
        : 'hidden';
      randomCountBadge.textContent = hasExtra
        ? rs.randomStarCount.replace('{count}', String(extraStars.length))
        : '';
    }
  };

  const renderSphereGridButton = () => {
    if (!sphereGridBtn) return;
    sphereGridBtn.setAttribute('aria-pressed', String(sphereGridVisible));
    sphereGridBtn.className = sphereGridVisible
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-equatorial-border bg-equatorial-soft px-2.5 py-1 text-xs font-semibold text-equatorial shadow-sm transition-colors'
      : 'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
  };

  const renderHideUndersideButton = () => {
    if (!hideUndersideBtn) return;
    const available =
      mode === 'horizon' ||
      mode === 'equatorial' ||
      mode === 'compare' ||
      (mode === 'ecliptic' && eclipticView === 'sunpath');
    hideUndersideBtn.className = !available
      ? 'hidden'
      : hideUnderside
        ? 'inline-flex items-center gap-1.5 rounded-lg border border-horizon-border bg-horizon-soft px-2.5 py-1 text-xs font-semibold text-horizon shadow-sm transition-colors'
        : 'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
    hideUndersideBtn.setAttribute('aria-pressed', String(hideUnderside));
  };

  let ecHintSpan: HTMLSpanElement | null = null;
  let ecInertialRow: HTMLDivElement | null = null;
  let ecSunPathRow: HTMLDivElement | null = null;
  let sunShadowBtn: HTMLButtonElement | null = null;
  let sunAnalemmaBtn: HTMLButtonElement | null = null;
  let sunMonthsBtn: HTMLButtonElement | null = null;

  const renderEclipticViewButtons = () => {
    if (!ecViewEclipticBtn || !ecViewSunPathBtn) return;
    const activeCls =
      'inline-flex items-center rounded-md border border-ecliptic-border bg-ecliptic text-ecliptic-contrast px-2.5 py-1 text-[11px] font-bold shadow-sm transition-colors';
    const idleCls =
      'inline-flex items-center rounded-md border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink px-2.5 py-1 text-[11px] font-medium transition-colors';
    ecViewEclipticBtn.setAttribute('aria-pressed', String(eclipticView === 'ecliptic'));
    ecViewSunPathBtn.setAttribute('aria-pressed', String(eclipticView === 'sunpath'));
    ecViewEclipticBtn.className = eclipticView === 'ecliptic' ? activeCls : idleCls;
    ecViewSunPathBtn.className = eclipticView === 'sunpath' ? activeCls : idleCls;

    if (ecHintSpan) {
      ecHintSpan.textContent =
        eclipticView === 'sunpath'
          ? t.module.sunMotions.sunPathHint
          : t.module.eclipticSceneHint;
    }
    if (ecInertialRow && ecSunPathRow) {
      ecInertialRow.className =
        eclipticView === 'ecliptic'
          ? 'flex flex-wrap items-center gap-1.5'
          : 'hidden';
      ecSunPathRow.className =
        eclipticView === 'sunpath'
          ? 'flex flex-wrap items-center gap-1.5'
          : 'hidden';
    }
    renderHideUndersideButton();
  };

  const renderSunPathToggleButtons = () => {
    const stylePill = (btn: HTMLButtonElement | null, on: boolean) => {
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(on));
      btn.style.opacity = on ? '1' : '0.45';
    };
    stylePill(sunShadowBtn, sunShadowEnabled);
    stylePill(sunAnalemmaBtn, sunAnalemmaEnabled);
    stylePill(sunMonthsBtn, sunMonthsEnabled);
  };

  const renderLockCoordsButton = () => {
    if (lockCoordsBtn) {
      lockCoordsBtn.setAttribute('aria-pressed', String(coordsLocked));
      if (coordsLocked) {
        lockCoordsBtn.className =
          'inline-flex items-center gap-1.5 rounded-lg border border-ecliptic-border bg-ecliptic text-ecliptic-contrast px-2.5 py-1 text-xs font-bold shadow-sm transition-colors';
        lockCoordsBtn.innerHTML = `${ICONS.lock('w-3.5 h-3.5 shrink-0')}<span>${t.module.coordsLocked}</span>`;
      } else {
        lockCoordsBtn.className =
          'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
        lockCoordsBtn.innerHTML = `${ICONS.unlock('w-3.5 h-3.5 shrink-0')}<span>${t.module.lockCoords}</span>`;
      }
    }
    if (lockedOverlayBadge) {
      lockedOverlayBadge.className = coordsLocked
        ? 'pointer-events-none absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 rounded-lg border border-ecliptic-border/80 bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-ecliptic backdrop-blur-sm shadow-sm'
        : 'hidden';
    }
  };

  const isExpandedView = () => isNativeFullscreen || isCssFullscreen;

  const renderFullscreenButton = () => {
    if (!fullscreenBtn) return;
    const expanded = isExpandedView();
    fullscreenBtn.setAttribute('aria-pressed', String(expanded));
    fullscreenBtn.className = expanded
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-equatorial-border bg-equatorial text-equatorial-contrast px-2.5 py-1 text-xs font-bold shadow-sm transition-colors'
      : 'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
    fullscreenBtn.innerHTML = expanded
      ? `${ICONS.minimize('w-3.5 h-3.5 shrink-0')}<span>${t.module.fullscreenExit}</span>`
      : `${ICONS.maximize('w-3.5 h-3.5 shrink-0')}<span>${t.module.fullscreenEnter}</span>`;
  };

  if (showControlsBar) {
    const topBar = document.createElement('div');
    topBar.className =
      'flex flex-wrap items-center justify-between gap-2 border-b border-line bg-subtle/70 px-4 py-2.5';

    const title = document.createElement('div');
    title.className = 'flex items-center gap-2 text-xs font-semibold text-ink';
    title.innerHTML = `${ICONS.globe(
      mode === 'horizon'
        ? 'w-4 h-4 text-horizon'
        : mode === 'ecliptic'
          ? 'w-4 h-4 text-ecliptic'
          : 'w-4 h-4 text-equatorial'
    )}<span>${t.module.sceneTitle}</span>`;

    const rightControls = document.createElement('div');
    rightControls.className = 'flex flex-wrap items-center gap-2';

    if (isRotatingSkyMode) {
      const viewSwitch = document.createElement('div');
      viewSwitch.className = 'inline-flex items-center gap-1';
      viewSwitch.setAttribute('role', 'group');
      viewSwitch.setAttribute('aria-label', t.module.rotatingSky.viewDual);

      dualViewSingleBtn = document.createElement('button');
      dualViewSingleBtn.type = 'button';
      dualViewSingleBtn.dataset.viewMode = 'single';
      dualViewSingleBtn.textContent = t.module.rotatingSky.viewSingle;

      dualViewSplitBtn = document.createElement('button');
      dualViewSplitBtn.type = 'button';
      dualViewSplitBtn.dataset.viewMode = 'dual';
      dualViewSplitBtn.textContent = t.module.rotatingSky.viewDual;

      viewSwitch.append(dualViewSingleBtn, dualViewSplitBtn);
      rightControls.appendChild(viewSwitch);
    }

    if (mode === 'ecliptic') {
      const ecSwitch = document.createElement('div');
      ecSwitch.className = 'inline-flex items-center gap-1';
      ecSwitch.setAttribute('role', 'group');

      ecViewSunPathBtn = document.createElement('button');
      ecViewSunPathBtn.type = 'button';
      ecViewSunPathBtn.dataset.eclipticView = 'sunpath';
      ecViewSunPathBtn.textContent = t.module.sunMotions.viewSunPath;

      ecViewEclipticBtn = document.createElement('button');
      ecViewEclipticBtn.type = 'button';
      ecViewEclipticBtn.dataset.eclipticView = 'ecliptic';
      ecViewEclipticBtn.textContent = t.module.sunMotions.viewEcliptic;

      ecSwitch.append(ecViewSunPathBtn, ecViewEclipticBtn);
      rightControls.appendChild(ecSwitch);
    }

    lockCoordsBtn = document.createElement('button');
    lockCoordsBtn.type = 'button';
    lockCoordsBtn.dataset.action = 'toggle-lock-coords';
    renderLockCoordsButton();

    hideUndersideBtn = document.createElement('button');
    hideUndersideBtn.type = 'button';
    hideUndersideBtn.dataset.action = 'toggle-hide-underside';
    hideUndersideBtn.textContent = t.module.hideUndersideToggle;
    renderHideUndersideButton();

    sphereGridBtn = document.createElement('button');
    sphereGridBtn.type = 'button';
    sphereGridBtn.dataset.action = 'toggle-sphere-grid';
    sphereGridBtn.innerHTML = `${ICONS.globe('w-3.5 h-3.5')}<span>${t.module.sphereGridToggle}</span>`;
    renderSphereGridButton();

    captureBtn = document.createElement('button');
    captureBtn.type = 'button';
    captureBtn.dataset.action = 'capture-scene';
    captureBtn.className =
      'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
    captureBtn.innerHTML = `${ICONS.capture('w-3.5 h-3.5 shrink-0')}<span>${t.module.captureImage}</span>`;

    fullscreenBtn = document.createElement('button');
    fullscreenBtn.type = 'button';
    fullscreenBtn.dataset.action = 'toggle-fullscreen';
    renderFullscreenButton();

    const resetCamBtn = document.createElement('button');
    resetCamBtn.type = 'button';
    resetCamBtn.dataset.action = 'reset-camera';
    resetCamBtn.className =
      'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
    resetCamBtn.innerHTML = `${ICONS.camera('w-3.5 h-3.5')}<span>${t.module.cameraReset}</span>`;

    rightControls.append(
      lockCoordsBtn,
      hideUndersideBtn,
      sphereGridBtn,
      captureBtn,
      fullscreenBtn,
      resetCamBtn
    );
    topBar.append(title, rightControls);
    wrapper.appendChild(topBar);
  }

  if (isRotatingSkyMode) {
    const rs = t.module.rotatingSky;

    const playbackBar = document.createElement('div');
    playbackBar.className =
      'flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2';

    siderealPlayBtn = document.createElement('button');
    siderealPlayBtn.type = 'button';
    siderealPlayBtn.dataset.action = 'toggle-sidereal';
    siderealPlayBtn.addEventListener('click', () => {
      siderealPlaying = !siderealPlaying;
      if (siderealPlaying) {
        stopDemo();
      }
      renderSiderealControls();
    });

    const speedWrap = document.createElement('div');
    speedWrap.className = 'flex flex-wrap items-center gap-1.5';
    speedWrap.setAttribute('role', 'group');
    speedWrap.setAttribute('aria-label', t.module.siderealPlayback.speedLabel);

    const speedLabel = document.createElement('span');
    speedLabel.className = 'text-xs font-medium text-ink-muted mr-0.5';
    speedLabel.textContent = `${t.module.siderealPlayback.speedLabel}:`;
    speedWrap.appendChild(speedLabel);

    for (const spd of [0.5, 1, 2, 4]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.siderealSpeed = String(spd);
      btn.textContent = `${spd}×`;
      btn.addEventListener('click', () => {
        siderealSpeed = spd;
        renderSiderealControls();
      });
      speedButtons.set(spd, btn);
      speedWrap.appendChild(btn);
    }

    renderSiderealControls();
    playbackBar.append(siderealPlayBtn, speedWrap);
    wrapper.appendChild(playbackBar);

    // Collapsible UNL NAAP Explorer Toolbar (keeps the initial 3D viewport clean & spacious)
    const explorerDetails = document.createElement('details');
    explorerDetails.className = 'border-b border-line bg-subtle/40 text-xs';

    const explorerSummary = document.createElement('summary');
    explorerSummary.className =
      'flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-1.5 text-[11px] font-semibold text-ink-secondary hover:text-ink transition-colors';
    explorerSummary.textContent = rs.explorerToggle;
    explorerDetails.appendChild(explorerSummary);

    const explorerBar = document.createElement('div');
    explorerBar.className =
      'flex flex-col gap-2 border-t border-line/60 px-4 py-2 text-xs';

    const row1 = document.createElement('div');
    row1.className = 'flex flex-wrap items-center justify-between gap-2';

    // Star Trails group
    const trailGroup = document.createElement('div');
    trailGroup.className = 'flex flex-wrap items-center gap-1';
    trailGroup.setAttribute('role', 'group');
    trailGroup.setAttribute('aria-label', rs.trailsLabel);

    const trailLbl = document.createElement('span');
    trailLbl.className = 'font-semibold text-ink-muted mr-1';
    trailLbl.textContent = `${rs.trailsLabel}:`;
    trailGroup.appendChild(trailLbl);

    for (const [m, lbl] of [
      ['none', rs.trailNone],
      ['short', rs.trailShort],
      ['long', rs.trailLong],
    ] as Array<[StarTrailMode, string]>) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.starTrail = m;
      btn.textContent = lbl;
      trailButtons.set(m, btn);
      trailGroup.appendChild(btn);
    }

    // Zone Caps + Multi-Star buttons
    const extrasGroup = document.createElement('div');
    extrasGroup.className = 'flex flex-wrap items-center gap-1.5';

    zoneCapsBtn = document.createElement('button');
    zoneCapsBtn.type = 'button';
    zoneCapsBtn.dataset.action = 'toggle-zone-caps';
    zoneCapsBtn.setAttribute('aria-pressed', 'false');
    zoneCapsBtn.textContent = rs.zoneCapsToggle;

    const addStarsBtn = document.createElement('button');
    addStarsBtn.type = 'button';
    addStarsBtn.dataset.action = 'add-random-stars';
    addStarsBtn.className =
      'inline-flex items-center rounded-lg border border-ecliptic-border bg-ecliptic-soft px-2.5 py-1 text-[11px] font-semibold text-ecliptic hover:opacity-90 transition-opacity';
    addStarsBtn.textContent = rs.addRandomStars;

    clearStarsBtn = document.createElement('button');
    clearStarsBtn.type = 'button';
    clearStarsBtn.dataset.action = 'clear-random-stars';
    clearStarsBtn.className =
      'hidden items-center rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-secondary hover:border-line-strong hover:text-ink';
    clearStarsBtn.textContent = rs.clearRandomStars;

    randomCountBadge = document.createElement('span');
    randomCountBadge.className = 'hidden text-[11px] font-medium text-ink-muted';

    extrasGroup.append(zoneCapsBtn, addStarsBtn, clearStarsBtn, randomCountBadge);
    row1.append(trailGroup, extrasGroup);

    // Row 2: Constellation pattern pills
    const row2 = document.createElement('div');
    row2.className = 'flex flex-wrap items-center gap-1';
    row2.setAttribute('role', 'group');
    row2.setAttribute('aria-label', rs.constellationLabel);

    const constLbl = document.createElement('span');
    constLbl.className = 'font-semibold text-ink-muted mr-1';
    constLbl.textContent = `${rs.constellationLabel}:`;
    row2.appendChild(constLbl);

    const constDefs: Array<[ConstellationId, string]> = [
      ['none', rs.constellationNone],
      ['bigDipper', i18n.pick(CONSTELLATIONS.bigDipper.shortName)],
      ['orion', i18n.pick(CONSTELLATIONS.orion.shortName)],
      ['crux', i18n.pick(CONSTELLATIONS.crux.shortName)],
    ];

    for (const [cid, lbl] of constDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.constellation = cid;
      btn.textContent = lbl;
      constellationButtons.set(cid, btn);
      row2.appendChild(btn);
    }

    constellationHintEl = document.createElement('p');
    constellationHintEl.className = 'hidden text-[11px] text-equatorial font-medium leading-snug';

    explorerBar.append(row1, row2, constellationHintEl);
    explorerDetails.appendChild(explorerBar);
    wrapper.appendChild(explorerDetails);
  }

  const stage = document.createElement('div');
  stage.className = `relative w-full ${heightClass}`;
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-label', t.module.sceneTitle);
  wrapper.appendChild(stage);

  if (showControlsBar) {
    lockedOverlayBadge = document.createElement('div');
    lockedOverlayBadge.className = 'hidden';
    lockedOverlayBadge.innerHTML = `${ICONS.lock('w-3.5 h-3.5 shrink-0')}<span>${t.module.coordsLockedHint}</span>`;
    stage.appendChild(lockedOverlayBadge);
  }

  if (isRotatingSkyMode) {
    const rs = t.module.rotatingSky;
    spaceOverlayBadge = document.createElement('div');
    spaceOverlayBadge.className =
      'hidden pointer-events-none absolute top-2.5 left-2.5 z-10 rounded-lg border border-equatorial-border/70 bg-surface/85 px-2.5 py-1 text-[11px] font-bold text-equatorial backdrop-blur-sm';
    spaceOverlayBadge.textContent = rs.spaceViewCaption;

    horizonOverlayBadge = document.createElement('div');
    horizonOverlayBadge.className =
      'hidden pointer-events-none absolute bottom-2.5 right-2.5 sm:top-2.5 sm:bottom-auto z-10 rounded-lg border border-horizon-border/70 bg-surface/85 px-2.5 py-1 text-[11px] font-bold text-horizon backdrop-blur-sm';
    horizonOverlayBadge.textContent = rs.horizonViewCaption;

    dualDividerEl = document.createElement('div');
    dualDividerEl.setAttribute('aria-hidden', 'true');
    dualDividerEl.className =
      'hidden pointer-events-none absolute z-10 bg-line-strong/70 inset-x-0 top-1/2 h-px sm:inset-y-0 sm:inset-x-auto sm:left-1/2 sm:top-0 sm:h-auto sm:w-px';

    stage.append(spaceOverlayBadge, horizonOverlayBadge, dualDividerEl);
  }

  // =========================================================================
  // Helper Controls / Legend Bar Below Canvas
  // =========================================================================
  const layerButtons = new Map<CoordAccent, HTMLButtonElement>();
  const layerState: Record<CoordAccent, boolean> = {
    horizon:
      mode === 'horizon' ||
      mode === 'equatorial' ||
      mode === 'compare' ||
      mode === 'hero',
    equatorial:
      mode === 'equatorial' ||
      mode === 'ecliptic' ||
      mode === 'compare' ||
      mode === 'hero',
    ecliptic: mode === 'ecliptic' || mode === 'compare' || mode === 'hero',
  };

  const horizonHelperButtons = new Map<HorizonHelperKey, HTMLButtonElement>();
  const horizonHelpers: Record<HorizonHelperKey, boolean> = {
    meridian: true,
    altitudeCircle: true,
    altitudeArc: true,
    azimuthArc: true,
    zenithNadir: true,
  };

  const eqHelperButtons = new Map<EquatorialHelperKey, HTMLButtonElement>();
  const eqHelpers: Record<EquatorialHelperKey, boolean> = {
    celestialEquator: true,
    polarAxis: true,
    horizonMeridian: true,
    decCircle: false,
    raDecArcs: true,
  };

  const ecHelperButtons = new Map<EclipticHelperKey, HTMLButtonElement>();
  const ecHelpers: Record<EclipticHelperKey, boolean> = {
    eclipticRing: true,
    celestialEquator: true,
    polesAxes: true,
    seasonalPoints: true,
    coordArcs: true,
  };

  let compareFocus: CoordAccent | null = null;
  const focusButtons = new Map<CoordAccent | 'all', HTMLButtonElement>();

  const bottomBar = document.createElement('div');
  bottomBar.className =
    'flex flex-col gap-2.5 border-t border-line bg-subtle/60 px-4 py-3 text-xs';

  let toggleAllHelpersBtn: HTMLButtonElement | null = null;
  const makeToggleAllHelpersBtn = (): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.action = 'toggle-all-helpers';
    btn.className =
      'inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
    btn.textContent = t.module.hideAllHelpers;
    return btn;
  };

  if (mode === 'horizon') {
    const helperHeader = document.createElement('div');
    helperHeader.className = 'flex flex-wrap items-center justify-between gap-2';
    helperHeader.innerHTML = `<span class="font-semibold text-ink">${t.module.helpersLabel}</span><span class="text-ink-muted">${t.module.horizonSceneHint}</span>`;

    const helperRow = document.createElement('div');
    helperRow.className = 'flex flex-wrap items-center gap-1.5';
    helperRow.setAttribute('role', 'group');
    helperRow.setAttribute('aria-label', t.module.helpersLabel);

    const helperDefs: Array<{ key: HorizonHelperKey; label: string }> = [
      { key: 'meridian', label: t.module.horizonHelpers.meridian },
      { key: 'altitudeCircle', label: t.module.horizonHelpers.altitudeCircle },
      { key: 'altitudeArc', label: t.module.horizonHelpers.altitudeArc },
      { key: 'azimuthArc', label: t.module.horizonHelpers.azimuthArc },
      { key: 'zenithNadir', label: t.module.horizonHelpers.zenithNadir },
    ];

    for (const def of helperDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'true');
      btn.dataset.helperKey = def.key;
      btn.className =
        'inline-flex items-center gap-1.5 rounded-full border border-horizon-border bg-horizon-soft px-3 py-1 text-xs font-semibold text-horizon transition-opacity';
      btn.innerHTML = `${ICONS.check('w-3.5 h-3.5 shrink-0')}<span>${def.label}</span>`;
      horizonHelperButtons.set(def.key, btn);
      helperRow.appendChild(btn);
    }
    toggleAllHelpersBtn = makeToggleAllHelpersBtn();
    helperRow.appendChild(toggleAllHelpersBtn);

    bottomBar.append(helperHeader, helperRow);
  } else if (mode === 'equatorial') {
    const helperHeader = document.createElement('div');
    helperHeader.className = 'flex flex-wrap items-center justify-between gap-2';
    helperHeader.innerHTML = `<span class="font-semibold text-ink">${t.module.helpersLabel}</span><span class="text-ink-muted">${t.module.equatorialSceneHint}</span>`;

    const helperRow = document.createElement('div');
    helperRow.className = 'flex flex-wrap items-center gap-1.5';
    helperRow.setAttribute('role', 'group');
    helperRow.setAttribute('aria-label', t.module.helpersLabel);

    const eqHelperDefs: Array<{ key: EquatorialHelperKey; label: string }> = [
      { key: 'celestialEquator', label: t.module.equatorialHelpers.celestialEquator },
      { key: 'polarAxis', label: t.module.equatorialHelpers.polarAxis },
      { key: 'horizonMeridian', label: t.module.equatorialHelpers.horizonMeridian },
      { key: 'decCircle', label: t.module.equatorialHelpers.decCircle },
      { key: 'raDecArcs', label: t.module.equatorialHelpers.raDecArcs },
    ];

    for (const def of eqHelperDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'true');
      btn.dataset.eqHelperKey = def.key;
      btn.className =
        'inline-flex items-center gap-1.5 rounded-full border border-equatorial-border bg-equatorial-soft px-3 py-1 text-xs font-semibold text-equatorial transition-opacity';
      btn.innerHTML = `${ICONS.check('w-3.5 h-3.5 shrink-0')}<span>${def.label}</span>`;
      eqHelperButtons.set(def.key, btn);
      helperRow.appendChild(btn);
    }
    toggleAllHelpersBtn = makeToggleAllHelpersBtn();
    helperRow.appendChild(toggleAllHelpersBtn);

    bottomBar.append(helperHeader, helperRow);
  } else if (mode === 'ecliptic') {
    const sm = t.module.sunMotions;
    const helperHeader = document.createElement('div');
    helperHeader.className = 'flex flex-wrap items-center justify-between gap-2';
    const hdrTitle = document.createElement('span');
    hdrTitle.className = 'font-semibold text-ink';
    hdrTitle.textContent = t.module.helpersLabel;
    ecHintSpan = document.createElement('span');
    ecHintSpan.className = 'text-ink-muted';
    ecHintSpan.textContent = sm.sunPathHint;
    helperHeader.append(hdrTitle, ecHintSpan);

    // Inertial Ecliptic helper pills
    ecInertialRow = document.createElement('div');
    ecInertialRow.className = 'hidden';
    ecInertialRow.setAttribute('role', 'group');
    ecInertialRow.setAttribute('aria-label', t.module.helpersLabel);

    const ecHelperDefs: Array<{ key: EclipticHelperKey; label: string }> = [
      { key: 'eclipticRing', label: t.module.eclipticHelpers.eclipticRing },
      { key: 'celestialEquator', label: t.module.eclipticHelpers.celestialEquator },
      { key: 'polesAxes', label: t.module.eclipticHelpers.polesAxes },
      { key: 'seasonalPoints', label: t.module.eclipticHelpers.seasonalPoints },
      { key: 'coordArcs', label: t.module.eclipticHelpers.coordArcs },
    ];

    for (const def of ecHelperDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'true');
      btn.dataset.ecHelperKey = def.key;
      btn.className =
        'inline-flex items-center gap-1.5 rounded-full border border-ecliptic-border bg-ecliptic-soft px-3 py-1 text-xs font-semibold text-ecliptic transition-opacity';
      btn.innerHTML = `${ICONS.check('w-3.5 h-3.5 shrink-0')}<span>${def.label}</span>`;
      ecHelperButtons.set(def.key, btn);
      ecInertialRow.appendChild(btn);
    }
    toggleAllHelpersBtn = makeToggleAllHelpersBtn();
    ecInertialRow.appendChild(toggleAllHelpersBtn);

    // Sun-Path Horizon helper pills (Shadow, Analemma, Month labels, Ecliptic, Equator)
    ecSunPathRow = document.createElement('div');
    ecSunPathRow.className = 'flex flex-wrap items-center gap-1.5';
    ecSunPathRow.setAttribute('role', 'group');

    const makeSunPill = (label: string, action: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.sunHelper = action;
      b.className =
        'inline-flex items-center gap-1.5 rounded-full border border-ecliptic-border bg-ecliptic-soft px-3 py-1 text-xs font-semibold text-ecliptic transition-opacity';
      b.innerHTML = `${ICONS.check('w-3.5 h-3.5 shrink-0')}<span>${label}</span>`;
      return b;
    };

    sunShadowBtn = makeSunPill(sm.shadowToggle, 'shadow');
    sunAnalemmaBtn = makeSunPill(sm.analemmaToggle, 'analemma');
    sunMonthsBtn = makeSunPill(sm.monthLabelsToggle, 'months');

    const spEcBtn = makeSunPill(t.module.eclipticHelpers.eclipticRing, 'eclipticRing');
    const spEqBtn = makeSunPill(t.module.eclipticHelpers.celestialEquator, 'celestialEquator');
    spEcBtn.addEventListener('click', () => {
      ecHelpers.eclipticRing = !ecHelpers.eclipticRing;
      spEcBtn.setAttribute('aria-pressed', String(ecHelpers.eclipticRing));
      spEcBtn.style.opacity = ecHelpers.eclipticRing ? '1' : '0.45';
      applyEclipticHelpers();
    });
    spEqBtn.addEventListener('click', () => {
      ecHelpers.celestialEquator = !ecHelpers.celestialEquator;
      spEqBtn.setAttribute('aria-pressed', String(ecHelpers.celestialEquator));
      spEqBtn.style.opacity = ecHelpers.celestialEquator ? '1' : '0.45';
      applyEclipticHelpers();
    });

    ecSunPathRow.append(sunShadowBtn, sunAnalemmaBtn, sunMonthsBtn, spEcBtn, spEqBtn);
    renderEclipticViewButtons();
    renderSunPathToggleButtons();

    bottomBar.append(helperHeader, ecInertialRow, ecSunPathRow);
  } else {
    const row = document.createElement('div');
    row.className = 'flex flex-wrap items-center justify-between gap-2';

    const legendGroup = document.createElement('div');
    legendGroup.className = 'flex flex-wrap items-center gap-2';

    const legendItems: Array<{
      key: CoordAccent;
      label: string;
      icon: string;
      badgeClass: string;
      showInModes: SkySceneMode[];
    }> = [
      {
        key: 'horizon',
        label: t.systems.horizon.shortName,
        icon: ICONS.horizon('w-3.5 h-3.5 shrink-0'),
        badgeClass: 'bg-horizon-soft text-horizon border-horizon-border',
        showInModes: ['compare', 'hero'],
      },
      {
        key: 'equatorial',
        label: t.systems.equatorial.shortName,
        icon: ICONS.equatorial('w-3.5 h-3.5 shrink-0'),
        badgeClass: 'bg-equatorial-soft text-equatorial border-equatorial-border',
        showInModes: ['compare', 'hero'],
      },
      {
        key: 'ecliptic',
        label: t.systems.ecliptic.shortName,
        icon: ICONS.ecliptic('w-3.5 h-3.5 shrink-0'),
        badgeClass: 'bg-ecliptic-soft text-ecliptic border-ecliptic-border',
        showInModes: ['compare', 'hero'],
      },
    ];

    for (const item of legendItems) {
      if (!item.showInModes.includes(mode)) continue;
      if (showLayerToggles) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'true');
        btn.className = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-opacity ${item.badgeClass}`;
        btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
        layerButtons.set(item.key, btn);
        legendGroup.appendChild(btn);
      } else {
        const pill = document.createElement('span');
        pill.className = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.badgeClass}`;
        pill.innerHTML = `${item.icon}<span>${item.label}</span>`;
        legendGroup.appendChild(pill);
      }
    }

    const hintText = document.createElement('span');
    hintText.className = 'text-ink-muted';
    hintText.textContent = mode === 'hero' ? t.home.previewNote : t.module.sceneHint;

    row.append(legendGroup, hintText);
    bottomBar.appendChild(row);

    // Focus single system pills in Compare mode
    if (mode === 'compare') {
      hintText.textContent = t.module.compareUi.compareSceneHint;
      const focusRow = document.createElement('div');
      focusRow.className = 'flex flex-wrap items-center gap-1.5 pt-1 border-t border-line/70';
      focusRow.setAttribute('role', 'group');
      focusRow.setAttribute('aria-label', t.module.compareUi.focusLabel);

      const focusTitle = document.createElement('span');
      focusTitle.className = 'text-xs font-semibold text-ink-muted mr-1';
      focusTitle.textContent = `${t.module.compareUi.focusLabel}:`;
      focusRow.appendChild(focusTitle);

      const focusDefs: Array<{
        key: CoordAccent | 'all';
        label: string;
        activeCls: string;
      }> = [
        {
          key: 'all',
          label: t.module.compareUi.focusAll,
          activeCls: 'border-line-strong bg-surface text-ink font-bold shadow-sm',
        },
        {
          key: 'horizon',
          label: t.module.compareUi.focusHorizon,
          activeCls: 'border-horizon-border bg-horizon text-horizon-contrast font-bold shadow-sm',
        },
        {
          key: 'equatorial',
          label: t.module.compareUi.focusEquatorial,
          activeCls: 'border-equatorial-border bg-equatorial text-equatorial-contrast font-bold shadow-sm',
        },
        {
          key: 'ecliptic',
          label: t.module.compareUi.focusEcliptic,
          activeCls: 'border-ecliptic-border bg-ecliptic text-ecliptic-contrast font-bold shadow-sm',
        },
      ];

      for (const def of focusDefs) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.focusSystem = def.key;
        btn.dataset.activeCls = def.activeCls;
        btn.textContent = def.label;
        focusButtons.set(def.key, btn);
        focusRow.appendChild(btn);
      }

      bottomBar.appendChild(focusRow);
    }
  }

  wrapper.appendChild(bottomBar);

  // Initialize Three.js WebGLRenderer safely
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    const fallback = document.createElement('div');
    fallback.className =
      'flex h-full w-full items-center justify-center p-6 text-center text-sm text-ink-secondary';
    fallback.textContent =
      'WebGL ไม่พร้อมใช้งานบนเบราว์เซอร์นี้ แต่คุณยังสามารถใช้งานแผงควบคุมและแบบทดสอบได้ตามปกติ';
    stage.appendChild(fallback);
    return {
      element: wrapper,
      setParams: () => {},
      setLayerVisibility: () => {},
      setHorizonHelperVisibility: () => {},
      setEquatorialHelperVisibility: () => {},
      setEclipticHelperVisibility: () => {},
      setCompareFocus: () => {},
      setSiderealPlaying: () => {},
      setEclipticView: () => {},
      setCoordsLocked: () => {},
      isCoordsLocked: () => false,
      setSunAnimation: () => {},
      startDemo: (_onV, onDone) => onDone(),
      startSteppedDemo: (_s, _v, _sc, onDone) => onDone(),
      animateToValues: (v, onV, onDone) => {
        onV(v);
        onDone?.();
      },
      stopDemo: () => {},
      resetCamera: () => {},
      dispose: () => {},
    };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className =
    'block h-full w-full cursor-grab active:cursor-grabbing';
  renderer.domElement.style.touchAction = 'none';
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 16 / 10, 0.1, 100);

  const defaultCameraPos =
    mode === 'hero'
      ? new THREE.Vector3(6.8, 4.4, 7.2)
      : mode === 'horizon'
        ? new THREE.Vector3(7.8, 5.2, 9.0)
        : mode === 'equatorial'
          ? new THREE.Vector3(7.8, 4.9, 8.8)
          : mode === 'ecliptic'
            ? new THREE.Vector3(7.6, 4.6, 8.6)
            : new THREE.Vector3(7.4, 4.8, 7.8);
  camera.position.copy(defaultCameraPos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 4.8;
  controls.maxDistance = 14.5;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.92);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(6, 9, 5);
  scene.add(dirLight);

  // =========================================================================
  // Base Celestial Sphere (Clean Lat/Lon Graticule — toggleable) & Stars
  // =========================================================================
  const sphereWireMat = new THREE.LineBasicMaterial({
    color: 0x475569,
    transparent: true,
    opacity: 0.22,
  });
  const sphereWire = new THREE.LineSegments(
    createSphereGraticuleGeometry(SPHERE_RADIUS),
    sphereWireMat
  );
  sphereWire.visible = sphereGridVisible;
  scene.add(sphereWire);

  const sphereShellMat = createGlassSphereMaterial();
  const sphereShell = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_RADIUS * 0.996, 64, 48),
    sphereShellMat
  );
  sphereShell.renderOrder = -1;
  scene.add(sphereShell);

  const dragUpperDomeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_RADIUS, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  );
  const dragFullSphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_RADIUS, 48, 32),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  );
  scene.add(dragUpperDomeMesh, dragFullSphereMesh);

  // Center marker (observer silhouette for horizon/equatorial/compare, Earth globe for ecliptic)
  const observerGroup = new THREE.Group();
  const observerMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.1,
  });
  if (mode === 'ecliptic') {
    const earthCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      })
    );
    observerGroup.add(earthCore);
  } else {
    const observerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.17, 0.05, 24),
      observerMat
    );
    observerBase.position.y = 0.025;
    const observerBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, 0.24, 16),
      observerMat
    );
    observerBody.position.y = 0.16;
    const observerHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 20, 20),
      observerMat
    );
    observerHead.position.y = 0.35;
    observerGroup.add(observerBase, observerBody, observerHead);
  }
  scene.add(observerGroup);

  const starCount = 260;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = ((i * 1973 + 17) % 1000) / 1000;
    const v = ((i * 4219 + 31) % 1000) / 1000;
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 11 + (i % 5) * 1.4;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xe2e8f0,
    size: 0.09,
    transparent: true,
    opacity: 0.8,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // =========================================================================
  // 1) HORIZON GROUP (Green)
  // =========================================================================
  const horizonGroup = new THREE.Group();
  scene.add(horizonGroup);

  const isEqRefHorizon = mode === 'equatorial';

  const horizonRingMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: isEqRefHorizon,
    opacity: isEqRefHorizon ? 0.58 : 0.92,
  });
  const horizonRing = new THREE.Mesh(
    new THREE.TorusGeometry(
      SPHERE_RADIUS,
      isEqRefHorizon || mode === 'ecliptic' ? 0.016 : 0.022,
      16,
      128
    ),
    horizonRingMat
  );
  horizonRing.rotation.x = Math.PI / 2;
  horizonGroup.add(horizonRing);

  const groundDiskMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const groundDisk = new THREE.Mesh(
    new THREE.CircleGeometry(SPHERE_RADIUS * 0.994, 72),
    groundDiskMat
  );
  groundDisk.rotation.x = -Math.PI / 2;
  horizonGroup.add(groundDisk);

  const zenithNadirGroup = new THREE.Group();
  horizonGroup.add(zenithNadirGroup);

  const zenithAxisMat = new THREE.LineDashedMaterial({
    color: 0x34d399,
    dashSize: 0.16,
    gapSize: 0.12,
    transparent: true,
    opacity: isEqRefHorizon ? 0.28 : 0.65,
  });
  const zenithAxisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -SPHERE_RADIUS, 0),
    new THREE.Vector3(0, SPHERE_RADIUS, 0),
  ]);
  const zenithAxis = new THREE.Line(zenithAxisGeo, zenithAxisMat);
  zenithAxis.computeLineDistances();
  zenithNadirGroup.add(zenithAxis);

  const poleDotMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  const zenithDot = new THREE.Mesh(
    new THREE.SphereGeometry(isEqRefHorizon ? 0.06 : 0.075, 16, 16),
    poleDotMat
  );
  zenithDot.position.set(0, SPHERE_RADIUS, 0);
  const nadirDot = new THREE.Mesh(
    new THREE.SphereGeometry(isEqRefHorizon ? 0.055 : 0.07, 16, 16),
    poleDotMat
  );
  nadirDot.position.set(0, -SPHERE_RADIUS, 0);
  zenithNadirGroup.add(zenithDot, nadirDot);

  const meridianGroup = new THREE.Group();
  horizonGroup.add(meridianGroup);
  const meridianMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: isEqRefHorizon ? 0.24 : 0.45,
  });
  const meridianRing = new THREE.Mesh(
    new THREE.TorusGeometry(SPHERE_RADIUS * 1.003, isEqRefHorizon ? 0.012 : 0.016, 12, 128),
    meridianMat
  );
  meridianRing.rotation.y = Math.PI / 2;
  meridianGroup.add(meridianRing);
  meridianGroup.visible = mode === 'horizon' || mode === 'equatorial' || mode === 'compare';

  const spriteRecords: Array<{
    sprite: THREE.Sprite;
    text: string;
    role: CoordAccent;
    wide?: boolean;
  }> = [];

  const zenithLabelText =
    mode === 'horizon' ? (isThai ? 'Z (เหนือศีรษะ)' : 'Z (Zenith)') : 'Z';
  const zenithSprite = createTextSprite(
    zenithLabelText,
    '#34d399',
    '#062f26',
    mode === 'horizon' ? 0.4 : 0.36,
    mode === 'horizon'
  );
  zenithSprite.position.set(0, SPHERE_RADIUS + 0.36, 0);
  zenithNadirGroup.add(zenithSprite);
  spriteRecords.push({
    sprite: zenithSprite,
    text: zenithLabelText,
    role: 'horizon',
    wide: mode === 'horizon',
  });

  if (mode === 'horizon') {
    const nadirLabelText = isThai ? 'Nadir (ใต้เท้า)' : 'Nadir';
    const nadirSprite = createTextSprite(nadirLabelText, '#34d399', '#062f26', 0.38, true);
    nadirSprite.position.set(0, -SPHERE_RADIUS - 0.36, 0);
    zenithNadirGroup.add(nadirSprite);
    spriteRecords.push({
      sprite: nadirSprite,
      text: nadirLabelText,
      role: 'horizon',
      wide: true,
    });
  }

  const horizonTargetGroup = new THREE.Group();
  horizonGroup.add(horizonTargetGroup);

  const starAnchor = new THREE.Group();
  horizonTargetGroup.add(starAnchor);

  const targetStarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x34d399,
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  const horizonStarMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 28, 28),
    targetStarMat
  );
  const starHaloMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  const starHaloMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 32),
    starHaloMat
  );
  const starHitMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 16, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  starAnchor.add(horizonStarMesh, starHaloMesh, starHitMesh);

  const altCircleGroup = new THREE.Group();
  horizonTargetGroup.add(altCircleGroup);
  const altCircleMat = new THREE.LineDashedMaterial({
    color: 0x34d399,
    dashSize: 0.14,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.65,
  });
  const altCircleLine = new THREE.Line(
    createCircleGeometry(SPHERE_RADIUS, 128),
    altCircleMat
  );
  altCircleLine.computeLineDistances();
  altCircleGroup.add(altCircleLine);

  const altArcGroup = new THREE.Group();
  horizonTargetGroup.add(altArcGroup);

  const horizonArcMat = new THREE.LineBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.48,
  });
  const altArcTubeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  const altSectorMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const zenithDistMat = new THREE.LineDashedMaterial({
    color: 0x34d399,
    dashSize: 0.1,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.45,
  });

  const altSectorMesh = new THREE.Mesh(new THREE.BufferGeometry(), altSectorMat);
  const altArcMesh = new THREE.Mesh(new THREE.BufferGeometry(), altArcTubeMat);
  const starSightLine = new THREE.Line(new THREE.BufferGeometry(), horizonArcMat);
  const zenithDistArc = new THREE.Line(new THREE.BufferGeometry(), zenithDistMat);
  const altAngleSprite = createTextSprite('Alt 45.0°', '#34d399', '#062f26', 0.36, true);
  altArcGroup.add(altSectorMesh, altArcMesh, starSightLine, zenithDistArc, altAngleSprite);

  const azArcGroup = new THREE.Group();
  horizonTargetGroup.add(azArcGroup);

  const azSectorMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const azArcTubeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  const azSectorMesh = new THREE.Mesh(new THREE.BufferGeometry(), azSectorMat);
  const azArcMesh = new THREE.Mesh(new THREE.BufferGeometry(), azArcTubeMat);
  const northRefRay = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(0, 0.02, -SPHERE_RADIUS),
    ]),
    horizonArcMat
  );
  const horizonAzLine = new THREE.Line(new THREE.BufferGeometry(), horizonArcMat);
  const footDot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), poleDotMat);
  const azAngleSprite = createTextSprite('Az 45.0°', '#34d399', '#062f26', 0.46, true);
  azArcGroup.add(azSectorMesh, azArcMesh, northRefRay, horizonAzLine, footDot, azAngleSprite);

  horizonTargetGroup.visible = mode === 'horizon' || mode === 'compare';
  if (mode === 'compare') {
    // Primary star mesh lives in eqStarAnchor so we don't duplicate spheres
    starAnchor.visible = false;
    altAngleSprite.visible = false;
    azAngleSprite.visible = false;
  }

  // =========================================================================
  // 2) CELESTIAL FRAME (Equatorial Blue + Ecliptic Yellow nested inside)
  // =========================================================================
  const celestialTiltGroup = new THREE.Group();
  scene.add(celestialTiltGroup);

  const polarAxisGroup = new THREE.Group();
  celestialTiltGroup.add(polarAxisGroup);

  const eqAxisMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.55,
  });
  const eqAxisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -SPHERE_RADIUS * 1.1, 0),
    new THREE.Vector3(0, SPHERE_RADIUS * 1.1, 0),
  ]);
  const eqAxis = new THREE.Line(eqAxisGeo, eqAxisMat);
  polarAxisGroup.add(eqAxis);

  const eqPoleDotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const ncpDot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), eqPoleDotMat);
  ncpDot.position.set(0, SPHERE_RADIUS, 0);
  const scpDot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), eqPoleDotMat);
  scpDot.position.set(0, -SPHERE_RADIUS, 0);
  polarAxisGroup.add(ncpDot, scpDot);

  const ncpText = 'NCP';
  const ncpSprite = createTextSprite(ncpText, '#38bdf8', '#08273e', 0.38, false);
  ncpSprite.position.set(0, SPHERE_RADIUS + 0.36, 0);
  polarAxisGroup.add(ncpSprite);
  spriteRecords.push({
    sprite: ncpSprite,
    text: ncpText,
    role: 'equatorial',
    wide: false,
  });

  if (mode === 'equatorial' || mode === 'ecliptic') {
    const scpText = 'SCP';
    const scpSprite = createTextSprite(scpText, '#38bdf8', '#08273e', 0.36, false);
    scpSprite.position.set(0, -SPHERE_RADIUS - 0.36, 0);
    polarAxisGroup.add(scpSprite);
    spriteRecords.push({
      sprite: scpSprite,
      text: scpText,
      role: 'equatorial',
      wide: false,
    });
  }

  const celestialSpinGroup = new THREE.Group();
  celestialTiltGroup.add(celestialSpinGroup);

  const equatorialGroup = new THREE.Group();
  celestialSpinGroup.add(equatorialGroup);

  const eqEquatorGroup = new THREE.Group();
  equatorialGroup.add(eqEquatorGroup);

  const equatorialRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const equatorialRing = new THREE.Mesh(
    new THREE.TorusGeometry(
      SPHERE_RADIUS * 1.004,
      mode === 'ecliptic' ? 0.013 : 0.022,
      16,
      128
    ),
    equatorialRingMat
  );
  equatorialRing.rotation.x = Math.PI / 2;
  eqEquatorGroup.add(equatorialRing);

  // Subtle translucent equatorial disk in ecliptic mode to make the ε angle crystal clear
  const eqRefDiskMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const eqRefDisk = new THREE.Mesh(
    new THREE.CircleGeometry(SPHERE_RADIUS * 0.99, 64),
    eqRefDiskMat
  );
  eqRefDisk.rotation.x = -Math.PI / 2;
  eqRefDisk.visible = mode === 'ecliptic';
  eqEquatorGroup.add(eqRefDisk);

  // Vernal Equinox marker in non-ecliptic modes (in ecliptic mode it's part of the 4 seasonal points)
  if (mode !== 'ecliptic') {
    const equinoxDot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), eqPoleDotMat);
    equinoxDot.position.set(0, 0, SPHERE_RADIUS);
    const equinoxLabel = 'γ';
    const equinoxSprite = createTextSprite(
      equinoxLabel,
      '#38bdf8',
      '#08273e',
      0.36,
      false
    );
    equinoxSprite.position.set(0, 0.22, SPHERE_RADIUS + 0.3);
    eqEquatorGroup.add(equinoxDot, equinoxSprite);
    spriteRecords.push({
      sprite: equinoxSprite,
      text: equinoxLabel,
      role: 'equatorial',
      wide: false,
    });
  }

  // Equatorial Target Star & Guides (Module 2)
  const eqTargetGroup = new THREE.Group();
  equatorialGroup.add(eqTargetGroup);

  const eqStarAnchor = new THREE.Group();
  eqTargetGroup.add(eqStarAnchor);

  const eqStarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  const eqStarMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 28, 28), eqStarMat);
  const eqStarHaloMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  const eqStarHaloMesh = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 32), eqStarHaloMat);
  const eqStarHitMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 16, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  eqStarAnchor.add(eqStarMesh, eqStarHaloMesh, eqStarHitMesh);

  const decCircleGroup = new THREE.Group();
  eqTargetGroup.add(decCircleGroup);
  const decCircleMat = new THREE.LineDashedMaterial({
    color: 0x38bdf8,
    dashSize: 0.14,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.65,
  });
  const decCircleLine = new THREE.Line(
    createCircleGeometry(SPHERE_RADIUS, 128),
    decCircleMat
  );
  decCircleLine.computeLineDistances();
  decCircleGroup.add(decCircleLine);

  const raDecArcsGroup = new THREE.Group();
  eqTargetGroup.add(raDecArcsGroup);

  const eqArcLineMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
  });
  const eqTubeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const eqSectorMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const raArcMesh = new THREE.Mesh(new THREE.BufferGeometry(), eqTubeMat);
  const raSectorMesh = new THREE.Mesh(new THREE.BufferGeometry(), eqSectorMat);
  const raFootDot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), eqPoleDotMat);
  const eqOriginRay = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, SPHERE_RADIUS),
    ]),
    eqArcLineMat
  );
  const eqFootRay = new THREE.Line(new THREE.BufferGeometry(), eqArcLineMat);
  const decArcMesh = new THREE.Mesh(new THREE.BufferGeometry(), eqTubeMat);
  const decSectorMesh = new THREE.Mesh(new THREE.BufferGeometry(), eqSectorMat);
  const eqStarRay = new THREE.Line(new THREE.BufferGeometry(), eqArcLineMat);
  const raAngleSprite = createTextSprite('RA 6 ชม. 00 น.', '#38bdf8', '#08273e', 0.36, true);
  const decAngleSprite = createTextSprite('Dec +23.5°', '#38bdf8', '#08273e', 0.36, true);

  raDecArcsGroup.add(
    raArcMesh,
    raSectorMesh,
    raFootDot,
    eqOriginRay,
    eqFootRay,
    decArcMesh,
    decSectorMesh,
    eqStarRay,
    raAngleSprite,
    decAngleSprite
  );
  eqTargetGroup.visible = mode === 'equatorial' || mode === 'compare';
  if (mode === 'compare') {
    raAngleSprite.visible = false;
    decAngleSprite.visible = false;
  }

  // =========================================================================
  // 3) ECLIPTIC GROUP (Yellow, dynamically tilted by ε around Vernal Equinox +Z)
  // =========================================================================
  const eclipticGroup = new THREE.Group();
  eclipticGroup.rotation.z = THREE.MathUtils.degToRad(params.obliquity ?? 23.5);
  celestialSpinGroup.add(eclipticGroup);

  const eclipticRingGroup = new THREE.Group();
  eclipticGroup.add(eclipticRingGroup);

  const eclipticRingMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.88,
  });
  const eclipticRing = new THREE.Mesh(
    new THREE.TorusGeometry(SPHERE_RADIUS * 1.006, 0.013, 16, 128),
    eclipticRingMat
  );
  eclipticRing.rotation.x = Math.PI / 2;
  eclipticRingGroup.add(eclipticRing);

  const eclipticPlaneDiskMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: mode === 'ecliptic' ? 0.1 : 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const eclipticPlaneDisk = new THREE.Mesh(
    new THREE.CircleGeometry(SPHERE_RADIUS * 0.995, 72),
    eclipticPlaneDiskMat
  );
  eclipticPlaneDisk.rotation.x = -Math.PI / 2;
  eclipticPlaneDisk.visible = mode === 'ecliptic';
  eclipticRingGroup.add(eclipticPlaneDisk);

  // Ecliptic Polar Axis (NEP - SEP)
  const eclipticPolesGroup = new THREE.Group();
  eclipticGroup.add(eclipticPolesGroup);

  const eclipticAxisMat = new THREE.LineDashedMaterial({
    color: 0xfacc15,
    dashSize: 0.15,
    gapSize: 0.1,
  });
  const eclipticAxisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -SPHERE_RADIUS * 1.12, 0),
    new THREE.Vector3(0, SPHERE_RADIUS * 1.12, 0),
  ]);
  const eclipticAxis = new THREE.Line(eclipticAxisGeo, eclipticAxisMat);
  eclipticAxis.computeLineDistances();
  eclipticPolesGroup.add(eclipticAxis);

  const ecPoleDotMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const nepDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), ecPoleDotMat);
  nepDot.position.set(0, SPHERE_RADIUS, 0);
  const sepDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), ecPoleDotMat);
  sepDot.position.set(0, -SPHERE_RADIUS, 0);
  eclipticPolesGroup.add(nepDot, sepDot);

  if (mode === 'ecliptic') {
    const nepText = 'NEP';
    const nepSprite = createTextSprite(nepText, '#facc15', '#2c2106', 0.36, false);
    nepSprite.position.set(0, SPHERE_RADIUS + 0.36, 0);
    eclipticPolesGroup.add(nepSprite);
    spriteRecords.push({ sprite: nepSprite, text: nepText, role: 'ecliptic', wide: false });

    const sepText = 'SEP';
    const sepSprite = createTextSprite(sepText, '#facc15', '#2c2106', 0.36, false);
    sepSprite.position.set(0, -SPHERE_RADIUS - 0.36, 0);
    eclipticPolesGroup.add(sepSprite);
    spriteRecords.push({ sprite: sepSprite, text: sepText, role: 'ecliptic', wide: false });
  }

  // 4 Seasonal Points on the Ecliptic (λ = 0°, 90°, 180°, 270°)
  const seasonalPointsGroup = new THREE.Group();
  eclipticGroup.add(seasonalPointsGroup);

  if (mode === 'ecliptic') {
    const seasonalDefs: Array<{
      lambda: number;
      label: string;
      offsetY: number;
    }> = [
      {
        lambda: 0,
        label: isThai ? '0° วสันตวิษุวัต (~21 มี.ค.)' : '0° Vernal (~Mar 21)',
        offsetY: -0.34,
      },
      {
        lambda: 90,
        label: isThai ? '90° ครีษมายัน (~21 มิ.ย.)' : '90° Summer (~Jun 21)',
        offsetY: 0.34,
      },
      {
        lambda: 180,
        label: isThai ? '180° ศารทวิษุวัต (~23 ก.ย.)' : '180° Autumnal (~Sep 23)',
        offsetY: 0.34,
      },
      {
        lambda: 270,
        label: isThai ? '270° เหมายัน (~22 ธ.ค.)' : '270° Winter (~Dec 22)',
        offsetY: -0.34,
      },
    ];

    for (const pt of seasonalDefs) {
      const p = eclipticToLocalCartesian(pt.lambda, 0, SPHERE_RADIUS);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), ecPoleDotMat);
      dot.position.set(p.x, p.y, p.z);
      const sp = createTextSprite(pt.label, '#facc15', '#2c2106', 0.38, true);
      sp.position.set(p.x * 1.15, p.y + pt.offsetY, p.z * 1.15);
      seasonalPointsGroup.add(dot, sp);
      spriteRecords.push({ sprite: sp, text: pt.label, role: 'ecliptic', wide: true });
    }
  }

  // Sun (Primary Object — ALWAYS moves on the ecliptic at β = 0°)
  const sunAnchor = new THREE.Group();
  eclipticGroup.add(sunAnchor);

  const sunMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.72,
    roughness: 0.2,
  });
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.155, 28, 28), sunMat);
  const sunHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
  });
  const sunHaloMesh = new THREE.Mesh(new THREE.RingGeometry(0.175, 0.215, 32), sunHaloMat);
  const sunSprite = createTextSprite(isThai ? 'ดวงอาทิตย์' : 'Sun', '#d97706', '#2c2106', 0.34, true);
  sunSprite.position.set(0, 0.34, 0);
  const sunHitMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  sunAnchor.add(sunMesh, sunHaloMesh, sunSprite, sunHitMesh);
  spriteRecords.push({
    sprite: sunSprite,
    text: isThai ? 'ดวงอาทิตย์' : 'Sun',
    role: 'ecliptic',
    wide: true,
  });

  // Draggable Test Star / Object (tracks (λ, β); overlaps Sun when β = 0°, pulls off-ecliptic when β ≠ 0°)
  const ecObjAnchor = new THREE.Group();
  eclipticGroup.add(ecObjAnchor);

  const ecObjMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfacc15,
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  const ecObjMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), ecObjMat);
  const ecObjHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const ecObjHaloMesh = new THREE.Mesh(new THREE.RingGeometry(0.19, 0.28, 32), ecObjHaloMat);
  const ecObjHitMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 16, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  ecObjAnchor.add(ecObjMesh, ecObjHaloMesh, ecObjHitMesh);
  ecObjAnchor.visible = mode === 'ecliptic';

  // Ecliptic Coordinate Arcs (λ longitude arc + β latitude arc + β parallel circle)
  const ecCoordArcsGroup = new THREE.Group();
  eclipticGroup.add(ecCoordArcsGroup);

  const ecArcLineMat = new THREE.LineBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.35,
  });
  const ecTubeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const ecSectorMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const ecLamArcMesh = new THREE.Mesh(new THREE.BufferGeometry(), ecTubeMat);
  const ecLamSectorMesh = new THREE.Mesh(new THREE.BufferGeometry(), ecSectorMat);
  const ecOriginRay = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, SPHERE_RADIUS),
    ]),
    ecArcLineMat
  );
  const ecSunRay = new THREE.Line(new THREE.BufferGeometry(), ecArcLineMat);
  const ecBetaArcMesh = new THREE.Mesh(new THREE.BufferGeometry(), ecTubeMat);
  const ecBetaSectorMesh = new THREE.Mesh(new THREE.BufferGeometry(), ecSectorMat);
  const ecObjRay = new THREE.Line(new THREE.BufferGeometry(), ecArcLineMat);
  const ecLatCircleMat = new THREE.LineDashedMaterial({
    color: 0xfacc15,
    dashSize: 0.14,
    gapSize: 0.08,
    transparent: true,
    opacity: 0.65,
  });
  const ecLatCircleLine = new THREE.Line(
    createCircleGeometry(SPHERE_RADIUS, 128),
    ecLatCircleMat
  );
  ecLatCircleLine.computeLineDistances();

  const lamAngleSprite = createTextSprite('λ 90.0°', '#facc15', '#2c2106', 0.42, true);
  const betaAngleSprite = createTextSprite('β +0.0°', '#facc15', '#2c2106', 0.42, true);

  ecCoordArcsGroup.add(
    ecLamArcMesh,
    ecLamSectorMesh,
    ecOriginRay,
    ecSunRay,
    ecBetaArcMesh,
    ecBetaSectorMesh,
    ecObjRay,
    ecLatCircleLine,
    lamAngleSprite,
    betaAngleSprite
  );
  ecCoordArcsGroup.visible = mode === 'ecliptic' || mode === 'compare';
  if (mode === 'compare') {
    lamAngleSprite.visible = false;
    betaAngleSprite.visible = false;
    ecLatCircleLine.visible = false;
  }

  // =========================================================================
  // 4) UNL NAAP Rotating Sky Extras (Equatorial & Compare modes)
  // =========================================================================
  const starTrailLayer = isRotatingSkyMode
    ? new StarTrailLayer(SPHERE_RADIUS)
    : null;
  const starPatternLayer = isRotatingSkyMode
    ? new StarPatternLayer(SPHERE_RADIUS)
    : null;
  const zoneCapsLayer = isRotatingSkyMode
    ? new ZoneCapsLayer(SPHERE_RADIUS)
    : null;
  const spaceView = isRotatingSkyMode
    ? new SpaceViewController(mode === 'compare')
    : null;

  if (starTrailLayer) celestialSpinGroup.add(starTrailLayer.group);
  if (starPatternLayer) celestialSpinGroup.add(starPatternLayer.group);
  if (zoneCapsLayer) celestialTiltGroup.add(zoneCapsLayer.group);

  // =========================================================================
  // 5) UNL NAAP Sun Motions Layer (Module 3 Horizon Sun-Path view)
  // =========================================================================
  const sunMotionLayer =
    mode === 'ecliptic' ? new SunMotionLayer(SPHERE_RADIUS, i18n.getLocale()) : null;
  if (sunMotionLayer) {
    scene.add(sunMotionLayer.horizonGroup);
    eclipticGroup.add(sunMotionLayer.eclipticMonthsGroup);
  }

  const horizonClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.02);

  const applyHideUnderside = () => {
    const canClip =
      mode === 'horizon' ||
      mode === 'equatorial' ||
      mode === 'compare' ||
      (mode === 'ecliptic' && eclipticView === 'sunpath');
    const shouldClip = canClip && hideUnderside;
    if (renderer) {
      renderer.clippingPlanes = shouldClip ? [horizonClipPlane] : [];
    }
    (sphereShellMat.uniforms as GlassSphereUniforms).uClipBelow.value = shouldClip
      ? 1.0
      : 0.0;
    nadirDot.visible = !shouldClip;
    renderHideUndersideButton();
  };

  // =========================================================================
  // Visibility & Dynamic Label State
  // =========================================================================
  let currentPalette = themeManager.getScenePalette();
  let currentIsDark = themeManager.getState().resolved === 'dark';
  let lastAltLabel = '';
  let lastAzLabel = '';
  let lastRaLabel = '';
  let lastDecLabel = '';
  let lastLamLabel = '';
  let lastBetaLabel = '';

  const applyLayerVisibility = () => {
    if (mode === 'equatorial') {
      horizonGroup.visible = eqHelpers.horizonMeridian;
      meridianGroup.visible = eqHelpers.horizonMeridian;
      zenithNadirGroup.visible = eqHelpers.horizonMeridian;
      polarAxisGroup.visible = eqHelpers.polarAxis;
      equatorialGroup.visible = true;
      eqEquatorGroup.visible = eqHelpers.celestialEquator;
      decCircleGroup.visible = eqHelpers.decCircle;
      raDecArcsGroup.visible = eqHelpers.raDecArcs;
      eclipticGroup.visible = false;
    } else if (mode === 'ecliptic') {
      const isSunPath = eclipticView === 'sunpath';
      horizonGroup.visible = isSunPath;
      meridianGroup.visible = false;
      zenithNadirGroup.visible = false;
      observerGroup.visible = !isSunPath;
      sunMotionLayer?.setVisible(isSunPath);

      equatorialGroup.visible = ecHelpers.celestialEquator;
      eqEquatorGroup.visible = ecHelpers.celestialEquator;
      eqRefDisk.visible = !isSunPath;
      polarAxisGroup.visible = isSunPath ? ecHelpers.celestialEquator : ecHelpers.polesAxes;

      eclipticGroup.visible = true;
      eclipticRingGroup.visible = ecHelpers.eclipticRing;
      eclipticPlaneDisk.visible = !isSunPath;
      eclipticPolesGroup.visible = !isSunPath && ecHelpers.polesAxes;
      seasonalPointsGroup.visible = !isSunPath && ecHelpers.seasonalPoints;
      ecCoordArcsGroup.visible = !isSunPath && ecHelpers.coordArcs;
      ecObjAnchor.visible = !isSunPath;
    } else {
      horizonGroup.visible = layerState.horizon;
      equatorialGroup.visible = layerState.equatorial;
      polarAxisGroup.visible = layerState.equatorial;
      eclipticGroup.visible = layerState.ecliptic;
    }

    equatorialRingMat.transparent = mode === 'ecliptic';
    equatorialRingMat.opacity = mode === 'ecliptic' ? 0.72 : 1;

    for (const [layer, btn] of layerButtons.entries()) {
      const isOn = layerState[layer];
      btn.setAttribute('aria-pressed', String(isOn));
      btn.style.opacity = isOn ? '1' : '0.45';
    }
  };

  const updateToggleAllHelpersLabel = (states: boolean[]) => {
    if (!toggleAllHelpersBtn) return;
    const anyOn = states.some(Boolean);
    toggleAllHelpersBtn.textContent = anyOn
      ? t.module.hideAllHelpers
      : t.module.showAllHelpers;
  };

  const applyHorizonHelpers = () => {
    if (mode !== 'horizon') return;
    meridianGroup.visible = horizonHelpers.meridian;
    altCircleGroup.visible = horizonHelpers.altitudeCircle;
    altArcGroup.visible = horizonHelpers.altitudeArc;
    azArcGroup.visible = horizonHelpers.azimuthArc;
    zenithNadirGroup.visible = horizonHelpers.zenithNadir;

    for (const [key, btn] of horizonHelperButtons.entries()) {
      const isOn = horizonHelpers[key];
      btn.setAttribute('aria-pressed', String(isOn));
      btn.style.opacity = isOn ? '1' : '0.45';
    }
    updateToggleAllHelpersLabel(Object.values(horizonHelpers));
  };

  const applyEquatorialHelpers = () => {
    if (mode !== 'equatorial') return;
    applyLayerVisibility();
    for (const [key, btn] of eqHelperButtons.entries()) {
      const isOn = eqHelpers[key];
      btn.setAttribute('aria-pressed', String(isOn));
      btn.style.opacity = isOn ? '1' : '0.45';
    }
    updateToggleAllHelpersLabel(Object.values(eqHelpers));
  };

  const applyEclipticHelpers = () => {
    if (mode !== 'ecliptic') return;
    applyLayerVisibility();
    for (const [key, btn] of ecHelperButtons.entries()) {
      const isOn = ecHelpers[key];
      btn.setAttribute('aria-pressed', String(isOn));
      btn.style.opacity = isOn ? '1' : '0.45';
    }
    updateToggleAllHelpersLabel(Object.values(ecHelpers));
  };

  const applyCompareFocus = () => {
    if (mode !== 'compare') return;
    const hAlpha = compareFocus === null || compareFocus === 'horizon' ? 1 : 0.16;
    const qAlpha = compareFocus === null || compareFocus === 'equatorial' ? 1 : 0.16;
    const eAlpha = compareFocus === null || compareFocus === 'ecliptic' ? 1 : 0.16;

    // Horizon materials
    horizonRingMat.transparent = hAlpha < 1;
    horizonRingMat.opacity = hAlpha;
    meridianMat.opacity = 0.38 * hAlpha;
    groundDiskMat.opacity = hAlpha;
    horizonArcMat.transparent = true;
    horizonArcMat.opacity = 0.48 * hAlpha;
    altArcTubeMat.transparent = hAlpha < 1;
    altArcTubeMat.opacity = hAlpha;
    altSectorMat.opacity = 0.1 * hAlpha;
    azArcTubeMat.transparent = hAlpha < 1;
    azArcTubeMat.opacity = hAlpha;
    azSectorMat.opacity = 0.12 * hAlpha;
    altCircleMat.opacity = 0.6 * hAlpha;
    zenithAxisMat.transparent = true;
    zenithAxisMat.opacity = 0.48 * hAlpha;

    // Equatorial materials
    equatorialRingMat.transparent = qAlpha < 1;
    equatorialRingMat.opacity = qAlpha;
    eqAxisMat.transparent = true;
    eqAxisMat.opacity = 0.55 * qAlpha;
    eqArcLineMat.transparent = true;
    eqArcLineMat.opacity = 0.35 * qAlpha;
    eqTubeMat.transparent = qAlpha < 1;
    eqTubeMat.opacity = qAlpha;
    eqSectorMat.opacity = 0.06 * qAlpha;
    decCircleMat.opacity = 0.65 * qAlpha;

    // Ecliptic materials
    eclipticRingMat.transparent = eAlpha < 1;
    eclipticRingMat.opacity = eAlpha;
    eclipticAxisMat.transparent = true;
    eclipticAxisMat.opacity = 0.65 * eAlpha;
    ecArcLineMat.transparent = true;
    ecArcLineMat.opacity = 0.35 * eAlpha;
    ecTubeMat.transparent = eAlpha < 1;
    ecTubeMat.opacity = eAlpha;
    ecSectorMat.opacity = 0.06 * eAlpha;
    sunHaloMat.opacity = 0.4 * eAlpha;

    // Sprite dimming
    for (const rec of spriteRecords) {
      const a =
        rec.role === 'horizon'
          ? hAlpha
          : rec.role === 'equatorial'
            ? qAlpha
            : eAlpha;
      (rec.sprite.material as THREE.SpriteMaterial).opacity = a < 1 ? 0.28 : 1;
    }

    for (const [key, btn] of focusButtons.entries()) {
      const isSelected =
        (key === 'all' && compareFocus === null) || key === compareFocus;
      btn.setAttribute('aria-pressed', String(isSelected));
      const activeCls = btn.dataset.activeCls ?? '';
      btn.className = isSelected
        ? `inline-flex items-center rounded-lg border px-2.5 py-1 text-xs transition-colors ${activeCls}`
        : 'inline-flex items-center rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
    }
  };

  for (const [key, btn] of focusButtons.entries()) {
    btn.addEventListener('click', () => {
      compareFocus = key === 'all' ? null : key;
      // Ensure the focused system is visible
      if (compareFocus && !layerState[compareFocus]) {
        layerState[compareFocus] = true;
        applyLayerVisibility();
      }
      applyCompareFocus();
    });
  }

  for (const [layer, btn] of layerButtons.entries()) {
    btn.addEventListener('click', () => {
      layerState[layer] = !layerState[layer];
      applyLayerVisibility();
    });
  }
  for (const [key, btn] of horizonHelperButtons.entries()) {
    btn.addEventListener('click', () => {
      horizonHelpers[key] = !horizonHelpers[key];
      applyHorizonHelpers();
    });
  }
  for (const [key, btn] of eqHelperButtons.entries()) {
    btn.addEventListener('click', () => {
      eqHelpers[key] = !eqHelpers[key];
      applyEquatorialHelpers();
    });
  }
  for (const [key, btn] of ecHelperButtons.entries()) {
    btn.addEventListener('click', () => {
      ecHelpers[key] = !ecHelpers[key];
      applyEclipticHelpers();
    });
  }

  toggleAllHelpersBtn?.addEventListener('click', () => {
    if (mode === 'horizon') {
      const next = !Object.values(horizonHelpers).some(Boolean);
      for (const k of Object.keys(horizonHelpers) as HorizonHelperKey[]) {
        horizonHelpers[k] = next;
      }
      applyHorizonHelpers();
    } else if (mode === 'equatorial') {
      const next = !Object.values(eqHelpers).some(Boolean);
      for (const k of Object.keys(eqHelpers) as EquatorialHelperKey[]) {
        eqHelpers[k] = next;
      }
      applyEquatorialHelpers();
    } else if (mode === 'ecliptic') {
      const next = !Object.values(ecHelpers).some(Boolean);
      for (const k of Object.keys(ecHelpers) as EclipticHelperKey[]) {
        ecHelpers[k] = next;
      }
      applyEclipticHelpers();
    }
  });

  sphereGridBtn?.addEventListener('click', () => {
    sphereGridVisible = !sphereGridVisible;
    sphereWire.visible = sphereGridVisible;
    spaceView?.setGridVisible(sphereGridVisible);
    renderSphereGridButton();
  });

  hideUndersideBtn?.addEventListener('click', () => {
    hideUnderside = !hideUnderside;
    applyHideUnderside();
  });

  const setCoordsLockedInternal = (nextLocked: boolean, notify = false) => {
    coordsLocked = nextLocked;
    if (coordsLocked) {
      isDraggingStar = false;
      activePointerId = null;
      isHoveringStar = false;
      controls.enabled = true;
      starHaloMesh.scale.setScalar(1.0);
      eqStarHaloMesh.scale.setScalar(1.0);
      ecObjHaloMesh.scale.setScalar(1.0);
      sunHaloMesh.scale.setScalar(1.0);
      if (renderer) {
        renderer.domElement.style.cursor = 'grab';
      }
    }
    renderLockCoordsButton();
    if (notify) {
      onLockChange?.(coordsLocked);
    }
  };

  lockCoordsBtn?.addEventListener('click', () => {
    setCoordsLockedInternal(!coordsLocked, true);
  });

  const setEclipticViewInternal = (nextView: EclipticViewMode) => {
    if (mode !== 'ecliptic') return;
    eclipticView = nextView;
    renderEclipticViewButtons();
    applyLayerVisibility();
    applyHideUnderside();
    updateGeometryFromParams();
    onEclipticViewChange?.(nextView);
  };

  ecViewSunPathBtn?.addEventListener('click', () => {
    setEclipticViewInternal('sunpath');
  });
  ecViewEclipticBtn?.addEventListener('click', () => {
    setEclipticViewInternal('ecliptic');
  });

  sunShadowBtn?.addEventListener('click', () => {
    sunShadowEnabled = !sunShadowEnabled;
    sunMotionLayer?.setOptions({ showShadow: sunShadowEnabled });
    renderSunPathToggleButtons();
    updateGeometryFromParams();
  });
  sunAnalemmaBtn?.addEventListener('click', () => {
    sunAnalemmaEnabled = !sunAnalemmaEnabled;
    sunMotionLayer?.setOptions({ showAnalemma: sunAnalemmaEnabled });
    renderSunPathToggleButtons();
    updateGeometryFromParams();
  });
  sunMonthsBtn?.addEventListener('click', () => {
    sunMonthsEnabled = !sunMonthsEnabled;
    sunMotionLayer?.setOptions({ showMonthLabels: sunMonthsEnabled });
    renderSunPathToggleButtons();
    updateGeometryFromParams();
  });

  const setTubeArc = (mesh: THREE.Mesh, points: THREE.Vector3[], radius = 0.028) => {
    mesh.geometry.dispose();
    if (points.length < 2) {
      mesh.geometry = new THREE.BufferGeometry();
      mesh.visible = false;
      return;
    }
    const curve = new THREE.CatmullRomCurve3(points);
    mesh.geometry = new THREE.TubeGeometry(
      curve,
      Math.max(12, points.length * 2),
      radius,
      8,
      false
    );
    mesh.visible = true;
  };

  const setSectorMesh = (
    mesh: THREE.Mesh,
    center: THREE.Vector3,
    arcPoints: THREE.Vector3[]
  ) => {
    mesh.geometry.dispose();
    if (arcPoints.length < 2) {
      mesh.geometry = new THREE.BufferGeometry();
      mesh.visible = false;
      return;
    }
    const verts: number[] = [];
    for (let i = 0; i < arcPoints.length - 1; i++) {
      const a = arcPoints[i];
      const b = arcPoints[i + 1];
      verts.push(center.x, center.y, center.z, a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    mesh.geometry = geo;
    mesh.visible = true;
  };

  const refreshDynamicAngleSprites = (force = false) => {
    const bgHex = currentIsDark ? '#0f172a' : '#ffffff';

    if (mode === 'horizon') {
      const altVal = roundToOneDecimal(params.altitude ?? 45);
      const azVal = wrapAzimuth(params.azimuth ?? 45);
      const fgHex = hexNumberToCss(currentPalette.horizon);

      const altStr = `Alt ${altVal.toFixed(1)}°`;
      if (force || altStr !== lastAltLabel) {
        lastAltLabel = altStr;
        updateTextSprite(altAngleSprite, altStr, fgHex, bgHex, true);
      }
      const azStr = `Az ${azVal.toFixed(1)}°`;
      if (force || azStr !== lastAzLabel) {
        lastAzLabel = azStr;
        updateTextSprite(azAngleSprite, azStr, fgHex, bgHex, true);
      }
    } else if (mode === 'equatorial') {
      const raVal = wrapHours(params.ra ?? 6);
      const decVal = roundToOneDecimal(params.dec ?? 23.5);
      const fgHex = hexNumberToCss(currentPalette.equatorial);

      const raStr = `RA ${formatHoursMinutes(raVal, i18n.getLocale())}`;
      if (force || raStr !== lastRaLabel) {
        lastRaLabel = raStr;
        updateTextSprite(raAngleSprite, raStr, fgHex, bgHex, true);
      }
      const sign = decVal > 0 ? '+' : decVal < 0 ? '−' : '';
      const decStr = `Dec ${sign}${Math.abs(decVal).toFixed(1)}°`;
      if (force || decStr !== lastDecLabel) {
        lastDecLabel = decStr;
        updateTextSprite(decAngleSprite, decStr, fgHex, bgHex, true);
      }
    } else if (mode === 'ecliptic') {
      const lamVal = wrapAzimuth(params.eclipticLon ?? 90);
      const betaVal = roundToOneDecimal(params.eclipticLat ?? 0);
      const fgHex = hexNumberToCss(currentPalette.ecliptic);

      const lamStr = `λ ${lamVal.toFixed(1)}°`;
      if (force || lamStr !== lastLamLabel) {
        lastLamLabel = lamStr;
        updateTextSprite(lamAngleSprite, lamStr, fgHex, bgHex, true);
      }
      const sign = betaVal > 0 ? '+' : betaVal < 0 ? '−' : '';
      const betaStr = `β ${sign}${Math.abs(betaVal).toFixed(1)}°`;
      if (force || betaStr !== lastBetaLabel) {
        lastBetaLabel = betaStr;
        updateTextSprite(betaAngleSprite, betaStr, fgHex, bgHex, true);
      }
    }
  };

  const updateGeometryFromParams = () => {
    // 1. Horizon Mode (and Compare Mode green horizon arcs)
    if (mode === 'horizon' || mode === 'compare') {
      const altDeg =
        mode === 'compare'
          ? Math.max(-90, Math.min(90, params.altitude ?? 45))
          : Math.max(0, Math.min(90, params.altitude ?? 45));
      const azDeg = wrapAzimuth(params.azimuth ?? 45);
      const altRad = THREE.MathUtils.degToRad(altDeg);
      const azRad = THREE.MathUtils.degToRad(azDeg);

      const pos = horizonToCartesian(altDeg, azDeg, SPHERE_RADIUS);
      starAnchor.position.set(pos.x, pos.y, pos.z);

      const ringRadius = SPHERE_RADIUS * Math.cos(altRad);
      const ringY = SPHERE_RADIUS * Math.sin(altRad);
      if (ringRadius > 0.04 && mode === 'horizon') {
        altCircleLine.visible = true;
        altCircleLine.geometry.dispose();
        altCircleLine.geometry = createCircleGeometry(ringRadius, 128);
        altCircleLine.position.y = ringY;
        altCircleLine.computeLineDistances();
      } else {
        altCircleLine.visible = false;
      }

      const foot = horizonToCartesian(0, azDeg, SPHERE_RADIUS);
      footDot.position.set(foot.x, 0.02, foot.z);

      horizonAzLine.geometry.dispose();
      horizonAzLine.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(foot.x, 0.02, foot.z),
      ]);

      starSightLine.geometry.dispose();
      starSightLine.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(pos.x, pos.y, pos.z),
      ]);

      const altArcPts: THREE.Vector3[] = [];
      const altSectorPts: THREE.Vector3[] = [];
      const sectorR = SPHERE_RADIUS * 0.62;
      if (Math.abs(altDeg) > 0.4) {
        const segs = Math.max(8, Math.round((Math.abs(altDeg) / 90) * 32));
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * altRad;
          const sinA = Math.sin(a);
          const cosA = Math.cos(a);
          altArcPts.push(
            new THREE.Vector3(
              SPHERE_RADIUS * cosA * Math.sin(azRad),
              SPHERE_RADIUS * sinA,
              -SPHERE_RADIUS * cosA * Math.cos(azRad)
            )
          );
          altSectorPts.push(
            new THREE.Vector3(
              sectorR * cosA * Math.sin(azRad),
              sectorR * sinA,
              -sectorR * cosA * Math.cos(azRad)
            )
          );
        }
      }
      setTubeArc(altArcMesh, altArcPts, mode === 'compare' ? 0.022 : 0.024);
      setSectorMesh(altSectorMesh, new THREE.Vector3(0, 0.02, 0), altSectorPts);

      const midAltRad = Math.max(THREE.MathUtils.degToRad(10), altRad * 0.5);
      const altLblR = SPHERE_RADIUS * 1.13;
      altAngleSprite.visible = mode === 'horizon' && altDeg >= 3;
      altAngleSprite.position.set(
        altLblR * Math.cos(midAltRad) * Math.sin(azRad),
        altLblR * Math.sin(midAltRad),
        -altLblR * Math.cos(midAltRad) * Math.cos(azRad)
      );

      const zPts: THREE.Vector3[] = [];
      if (mode === 'horizon' && altDeg < 89.5) {
        const zSegs = 20;
        for (let i = 0; i <= zSegs; i++) {
          const a = altRad + (i / zSegs) * (Math.PI / 2 - altRad);
          zPts.push(
            new THREE.Vector3(
              SPHERE_RADIUS * Math.cos(a) * Math.sin(azRad),
              SPHERE_RADIUS * Math.sin(a),
              -SPHERE_RADIUS * Math.cos(a) * Math.cos(azRad)
            )
          );
        }
      }
      zenithDistArc.geometry.dispose();
      zenithDistArc.geometry = new THREE.BufferGeometry().setFromPoints(zPts);
      if (zPts.length >= 2) {
        zenithDistArc.computeLineDistances();
        zenithDistArc.visible = true;
      } else {
        zenithDistArc.visible = false;
      }

      const azArcPts: THREE.Vector3[] = [];
      const azRadius = SPHERE_RADIUS * 0.56;
      if (azDeg > 0.5) {
        const azSegs = Math.max(8, Math.round((azDeg / 360) * 72));
        for (let i = 0; i <= azSegs; i++) {
          const theta = (i / azSegs) * azRad;
          azArcPts.push(
            new THREE.Vector3(
              azRadius * Math.sin(theta),
              0.03,
              -azRadius * Math.cos(theta)
            )
          );
        }
      }
      setTubeArc(azArcMesh, azArcPts, 0.022);
      setSectorMesh(azSectorMesh, new THREE.Vector3(0, 0.025, 0), azArcPts);

      const midAzRad = azDeg > 4 ? azRad * 0.5 : THREE.MathUtils.degToRad(14);
      const azLblR = azRadius * 0.74;
      azAngleSprite.visible = mode === 'horizon' && azDeg >= 6;
      azAngleSprite.position.set(
        azLblR * Math.sin(midAzRad),
        0.16,
        -azLblR * Math.cos(midAzRad)
      );

      refreshDynamicAngleSprites(false);
    }

    // 2. Celestial Frame Orientation & Dynamic Obliquity ε
    const lat = params.latitude ?? 14;
    const obliquityDeg =
      mode === 'ecliptic' || mode === 'compare'
        ? Math.max(0, Math.min(90, params.obliquity ?? (mode === 'compare' ? 23.44 : 23.5)))
        : 23.5;
    eclipticGroup.rotation.z = THREE.MathUtils.degToRad(obliquityDeg);

    if (mode === 'equatorial' || mode === 'compare' || mode === 'hero') {
      celestialTiltGroup.rotation.x = -THREE.MathUtils.degToRad(90 - lat);
    } else if (mode === 'ecliptic') {
      if (eclipticView === 'sunpath') {
        const cDay = wrapCalendarDay(
          params.calendarDay ?? dayOffsetToCalendarDay(params.dayOfYear ?? 91)
        );
        const sTime = wrapHours(params.solarTime ?? 12);
        const sunState = computeSunMotionState(
          cDay,
          sTime,
          lat,
          obliquityDeg,
          i18n.getLocale(),
          wrapAzimuth(params.eclipticLon ?? 90)
        );
        celestialTiltGroup.rotation.x = -THREE.MathUtils.degToRad(90 - lat);
        celestialSpinGroup.rotation.y = -THREE.MathUtils.degToRad(sunState.lstHours * 15);
        sunMotionLayer?.update(sunState, lat, obliquityDeg);
        (sphereShellMat.uniforms as GlassSphereUniforms).uDaylightMix.value =
          THREE.MathUtils.clamp((sunState.altitudeDeg + 6) / 28, 0, 1);
      } else {
        celestialTiltGroup.rotation.x = 0;
        celestialSpinGroup.rotation.y = 0;
        (sphereShellMat.uniforms as GlassSphereUniforms).uDaylightMix.value = 0;
      }
    }

    if (mode === 'equatorial' || mode === 'compare') {
      const lstHours = wrapHours(params.lst ?? 8);
      celestialSpinGroup.rotation.y = -THREE.MathUtils.degToRad(lstHours * 15);
    }

    // 3. Equatorial Mode (and Compare Mode blue equatorial arcs & primary star)
    if (mode === 'equatorial' || mode === 'compare') {
      const raHours = wrapHours(params.ra ?? 6);
      const decDeg = Math.max(-90, Math.min(90, params.dec ?? 23.5));
      const raRad = THREE.MathUtils.degToRad(raHours * 15);
      const decRad = THREE.MathUtils.degToRad(decDeg);

      const starLocal = equatorialToLocalCartesian(raHours, decDeg, SPHERE_RADIUS);
      eqStarAnchor.position.set(starLocal.x, starLocal.y, starLocal.z);

      const decRadius = SPHERE_RADIUS * Math.cos(decRad);
      const decY = SPHERE_RADIUS * Math.sin(decRad);
      if (decRadius > 0.04) {
        decCircleLine.visible = true;
        decCircleLine.geometry.dispose();
        decCircleLine.geometry = createCircleGeometry(decRadius, 128);
        decCircleLine.position.y = decY;
        decCircleLine.computeLineDistances();
      } else {
        decCircleLine.visible = false;
      }

      const foot = equatorialToLocalCartesian(raHours, 0, SPHERE_RADIUS);
      raFootDot.position.set(foot.x, 0, foot.z);

      eqFootRay.geometry.dispose();
      eqFootRay.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(foot.x, 0, foot.z),
      ]);

      eqStarRay.geometry.dispose();
      eqStarRay.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(starLocal.x, starLocal.y, starLocal.z),
      ]);

      const raArcPts: THREE.Vector3[] = [];
      const raR = SPHERE_RADIUS * 0.56;
      if (raHours > 0.05) {
        const raSegs = Math.max(8, Math.round((raHours / 24) * 72));
        for (let i = 0; i <= raSegs; i++) {
          const theta = (i / raSegs) * raRad;
          raArcPts.push(
            new THREE.Vector3(raR * Math.sin(theta), 0, raR * Math.cos(theta))
          );
        }
      }
      setTubeArc(raArcMesh, raArcPts, 0.022);
      setSectorMesh(raSectorMesh, new THREE.Vector3(0, 0, 0), raArcPts);

      const midRaRad = raHours > 0.4 ? raRad * 0.5 : THREE.MathUtils.degToRad(14);
      const raLblR = raR * 0.82;
      raAngleSprite.visible = mode === 'equatorial' && raHours >= 0.45;
      raAngleSprite.position.set(
        raLblR * Math.sin(midRaRad),
        0.16,
        raLblR * Math.cos(midRaRad)
      );

      const decArcPts: THREE.Vector3[] = [];
      const decSectorPts: THREE.Vector3[] = [];
      const decSecR = SPHERE_RADIUS * 0.62;
      if (Math.abs(decDeg) > 0.4) {
        const decSegs = Math.max(8, Math.round((Math.abs(decDeg) / 90) * 32));
        for (let i = 0; i <= decSegs; i++) {
          const d = (i / decSegs) * decRad;
          const cosD = Math.cos(d);
          const sinD = Math.sin(d);
          decArcPts.push(
            new THREE.Vector3(
              SPHERE_RADIUS * cosD * Math.sin(raRad),
              SPHERE_RADIUS * sinD,
              SPHERE_RADIUS * cosD * Math.cos(raRad)
            )
          );
          decSectorPts.push(
            new THREE.Vector3(
              decSecR * cosD * Math.sin(raRad),
              decSecR * sinD,
              decSecR * cosD * Math.cos(raRad)
            )
          );
        }
      }
      setTubeArc(decArcMesh, decArcPts, 0.024);
      setSectorMesh(decSectorMesh, new THREE.Vector3(0, 0, 0), decSectorPts);

      const midDecRad =
        Math.abs(decDeg) > 6
          ? decRad * 0.5
          : THREE.MathUtils.degToRad(decDeg >= 0 ? 10 : -10);
      const decLblR = SPHERE_RADIUS * 1.15;
      decAngleSprite.visible = mode === 'equatorial' && Math.abs(decDeg) >= 3;
      decAngleSprite.position.set(
        decLblR * Math.cos(midDecRad) * Math.sin(raRad),
        decLblR * Math.sin(midDecRad),
        decLblR * Math.cos(midDecRad) * Math.cos(raRad)
      );

      const lstHours = wrapHours(params.lst ?? 8);
      starTrailLayer?.update(raHours, decDeg, lat, lstHours);
      if (zoneCapsEnabled) {
        zoneCapsLayer?.update(lat);
      }
      spaceView?.syncState(
        raHours,
        decDeg,
        lat,
        lstHours,
        obliquityDeg,
        activeConstellation,
        extraStars,
        zoneCapsEnabled
      );

      refreshDynamicAngleSprites(false);
    }

    // 4. Ecliptic Sun (always β = 0°) + Draggable Test Object (λ, β) + Arcs
    const lamDeg = wrapAzimuth(params.eclipticLon ?? 90);
    const betaDeg = Math.max(-90, Math.min(90, params.eclipticLat ?? 0));
    const lamRad = THREE.MathUtils.degToRad(lamDeg);
    const betaRad = THREE.MathUtils.degToRad(betaDeg);

    // Sun stays strictly on the Ecliptic circle (β = 0°)
    const sunLamDeg =
      mode === 'compare'
        ? wrapAzimuth(params.sunLambda ?? 90)
        : lamDeg;
    const sunPos = eclipticToLocalCartesian(sunLamDeg, 0, SPHERE_RADIUS);
    sunAnchor.position.set(sunPos.x, sunPos.y, sunPos.z);
    // Keep Sun orb unobstructed in Sun-Path mode; in inertial Ecliptic mode push label radially outward
    sunSprite.visible = !(mode === 'ecliptic' && eclipticView === 'sunpath');
    const sunDirLen = Math.hypot(sunPos.x, sunPos.y, sunPos.z) || 1;
    sunSprite.position.set(
      (sunPos.x / sunDirLen) * 0.36,
      (sunPos.y / sunDirLen) * 0.36 + 0.18,
      (sunPos.z / sunDirLen) * 0.36
    );

    if (mode === 'ecliptic' || mode === 'compare') {
      const objPos = eclipticToLocalCartesian(lamDeg, betaDeg, SPHERE_RADIUS);
      const lamFootPos = eclipticToLocalCartesian(lamDeg, 0, SPHERE_RADIUS);
      ecObjAnchor.position.set(objPos.x, objPos.y, objPos.z);

      const isOffEcliptic = Math.abs(betaDeg) >= 0.3;
      ecObjMesh.visible = mode === 'ecliptic' && isOffEcliptic;
      ecObjHaloMesh.visible = mode === 'ecliptic' && isOffEcliptic;

      ecSunRay.geometry.dispose();
      ecSunRay.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(lamFootPos.x, 0, lamFootPos.z),
      ]);

      ecObjRay.geometry.dispose();
      ecObjRay.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(objPos.x, objPos.y, objPos.z),
      ]);
      ecObjRay.visible = isOffEcliptic;

      // Longitude λ arc from Vernal Equinox (λ = 0° at +Z) eastward (+X)
      const lamArcPts: THREE.Vector3[] = [];
      const lamR = SPHERE_RADIUS * 0.56;
      if (lamDeg > 0.5) {
        const lamSegs = Math.max(8, Math.round((lamDeg / 360) * 72));
        for (let i = 0; i <= lamSegs; i++) {
          const theta = (i / lamSegs) * lamRad;
          lamArcPts.push(
            new THREE.Vector3(lamR * Math.sin(theta), 0, lamR * Math.cos(theta))
          );
        }
      }
      setTubeArc(ecLamArcMesh, lamArcPts, 0.016);
      setSectorMesh(ecLamSectorMesh, new THREE.Vector3(0, 0, 0), lamArcPts);

      const midLamRad = lamDeg > 4 ? lamRad * 0.5 : THREE.MathUtils.degToRad(14);
      const lamLblR = lamR * 0.8;
      lamAngleSprite.visible = mode === 'ecliptic' && lamDeg >= 8;
      lamAngleSprite.position.set(
        lamLblR * Math.sin(midLamRad),
        0.16,
        lamLblR * Math.cos(midLamRad)
      );

      // Latitude β arc + parallel circle when test object is off the ecliptic
      const betaArcPts: THREE.Vector3[] = [];
      const betaSectorPts: THREE.Vector3[] = [];
      const betaSecR = SPHERE_RADIUS * 0.62;
      if (isOffEcliptic) {
        const bSegs = Math.max(8, Math.round((Math.abs(betaDeg) / 90) * 32));
        for (let i = 0; i <= bSegs; i++) {
          const b = (i / bSegs) * betaRad;
          const cosB = Math.cos(b);
          const sinB = Math.sin(b);
          betaArcPts.push(
            new THREE.Vector3(
              SPHERE_RADIUS * cosB * Math.sin(lamRad),
              SPHERE_RADIUS * sinB,
              SPHERE_RADIUS * cosB * Math.cos(lamRad)
            )
          );
          betaSectorPts.push(
            new THREE.Vector3(
              betaSecR * cosB * Math.sin(lamRad),
              betaSecR * sinB,
              betaSecR * cosB * Math.cos(lamRad)
            )
          );
        }

        const latRingR = SPHERE_RADIUS * Math.cos(betaRad);
        const latRingY = SPHERE_RADIUS * Math.sin(betaRad);
        if (mode === 'ecliptic' && latRingR > 0.04) {
          ecLatCircleLine.visible = true;
          ecLatCircleLine.geometry.dispose();
          ecLatCircleLine.geometry = createCircleGeometry(latRingR, 128);
          ecLatCircleLine.position.y = latRingY;
          ecLatCircleLine.computeLineDistances();
        } else {
          ecLatCircleLine.visible = false;
        }

        const midBetaRad = betaRad * 0.5;
        const betaLblR = SPHERE_RADIUS * 0.78;
        betaAngleSprite.visible = mode === 'ecliptic';
        betaAngleSprite.position.set(
          betaLblR * Math.cos(midBetaRad) * Math.sin(lamRad),
          betaLblR * Math.sin(midBetaRad) + (betaDeg >= 0 ? 0.14 : -0.14),
          betaLblR * Math.cos(midBetaRad) * Math.cos(lamRad)
        );
      } else {
        ecLatCircleLine.visible = false;
        betaAngleSprite.visible = false;
      }

      setTubeArc(ecBetaArcMesh, betaArcPts, 0.017);
      setSectorMesh(ecBetaSectorMesh, new THREE.Vector3(0, 0, 0), betaSectorPts);

      refreshDynamicAngleSprites(false);
    }
  };

  // =========================================================================
  // Star / Object Dragging + Dual-View Space Orbit & Constellation Click
  // =========================================================================
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let isDraggingStar = false;
  let activePointerId: number | null = null;
  let isHoveringStar = false;
  let isOrbitingSpaceView = false;
  let spaceOrbitPointerId: number | null = null;
  let lastSpaceX = 0;
  let lastSpaceY = 0;
  const isDraggableMode =
    mode === 'horizon' ||
    mode === 'equatorial' ||
    mode === 'ecliptic' ||
    mode === 'compare';

  const getActiveHitMesh = () =>
    mode === 'equatorial' || mode === 'compare'
      ? eqStarHitMesh
      : mode === 'ecliptic'
        ? eclipticView === 'sunpath'
          ? sunHitMesh
          : ecObjHitMesh
        : starHitMesh;

  const getActiveHaloMesh = () =>
    mode === 'equatorial' || mode === 'compare'
      ? eqStarHaloMesh
      : mode === 'ecliptic'
        ? eclipticView === 'sunpath'
          ? sunHaloMesh
          : Math.abs(params.eclipticLat ?? 0) >= 0.3
            ? ecObjHaloMesh
            : sunHaloMesh
        : starHaloMesh;

  const isInSpacePane = (clientX: number, clientY: number): boolean => {
    if (!dualView || !spaceView || !renderer) return false;
    const rect = renderer.domElement.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    return rect.width >= 640 ? relX < rect.width / 2 : relY < rect.height / 2;
  };

  const updatePointerNdc = (clientX: number, clientY: number) => {
    const rect = renderer!.domElement.getBoundingClientRect();
    if (dualView && spaceView) {
      if (rect.width >= 640) {
        const halfW = rect.width / 2;
        pointerNdc.x = ((clientX - (rect.left + halfW)) / halfW) * 2 - 1;
        pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      } else {
        const halfH = rect.height / 2;
        pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((clientY - (rect.top + halfH)) / halfH) * 2 + 1;
      }
      return;
    }
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!isDraggableMode || !renderer) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    // Dual View: dragging inside Space View half orbits Space View independently
    if (dualView && spaceView && isInSpacePane(event.clientX, event.clientY)) {
      isOrbitingSpaceView = true;
      spaceOrbitPointerId = event.pointerId;
      lastSpaceX = event.clientX;
      lastSpaceY = event.clientY;
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    // When coordinates are locked, all clicks/drags on the 3D scene orbit the camera freely
    if (coordsLocked) return;

    updatePointerNdc(event.clientX, event.clientY);
    raycaster.setFromCamera(pointerNdc, camera);

    const starHits = raycaster.intersectObject(getActiveHitMesh(), false);
    if (starHits.length > 0) {
      isDraggingStar = true;
      activePointerId = event.pointerId;
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
      getActiveHaloMesh().scale.setScalar(1.3);
      stopDemo();
      if (siderealPlaying) {
        siderealPlaying = false;
        renderSiderealControls();
      }
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    // Click any constellation star or extra random star to make it the active target star
    if (starPatternLayer) {
      const clickable = starPatternLayer.getClickableMeshes();
      if (clickable.length > 0) {
        const patternHits = raycaster.intersectObjects(clickable, false);
        if (patternHits.length > 0) {
          const data = patternHits[0].object.userData as {
            ra?: number;
            dec?: number;
          };
          if (typeof data.ra === 'number' && typeof data.dec === 'number') {
            stopDemo();
            const ra = wrapHours(Number(data.ra.toFixed(2)));
            const dec = roundToOneDecimal(data.dec);
            params.ra = ra;
            params.dec = dec;
            updateGeometryFromParams();
            onUserDrag?.({ ra, dec });
            event.stopPropagation();
            event.preventDefault();
          }
        }
      }
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDraggableMode || !renderer) return;

    if (isOrbitingSpaceView && event.pointerId === spaceOrbitPointerId) {
      const dx = event.clientX - lastSpaceX;
      const dy = event.clientY - lastSpaceY;
      lastSpaceX = event.clientX;
      lastSpaceY = event.clientY;
      spaceView?.orbitBy(dx, dy);
      return;
    }

    if (dualView && !isDraggingStar && isInSpacePane(event.clientX, event.clientY)) {
      if (isHoveringStar) {
        isHoveringStar = false;
        getActiveHaloMesh().scale.setScalar(1.0);
      }
      renderer.domElement.style.cursor = 'grab';
      return;
    }

    updatePointerNdc(event.clientX, event.clientY);
    raycaster.setFromCamera(pointerNdc, camera);

    if (isDraggingStar && event.pointerId === activePointerId) {
      if (mode === 'horizon') {
        const domeHits = raycaster.intersectObject(dragUpperDomeMesh, false);
        let hitPoint: THREE.Vector3 | null = null;
        if (domeHits.length > 0) {
          hitPoint = domeHits[0].point;
        } else {
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          const intersection = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(plane, intersection)) {
            intersection.normalize().multiplyScalar(SPHERE_RADIUS);
            intersection.y = 0;
            hitPoint = intersection;
          }
        }
        if (hitPoint) {
          const next = cartesianToHorizon(hitPoint.x, hitPoint.y, hitPoint.z);
          params.altitude = next.altitude;
          params.azimuth = next.azimuth;
          updateGeometryFromParams();
          onUserDrag?.({ altitude: next.altitude, azimuth: next.azimuth });
        }
      } else if (mode === 'equatorial' || mode === 'compare') {
        const sphereHits = raycaster.intersectObject(dragFullSphereMesh, false);
        if (sphereHits.length > 0) {
          celestialSpinGroup.updateWorldMatrix(true, false);
          const localPt = celestialSpinGroup.worldToLocal(
            sphereHits[0].point.clone()
          );
          const next = localCartesianToEquatorial(localPt.x, localPt.y, localPt.z);
          params.ra = next.ra;
          params.dec = next.dec;
          updateGeometryFromParams();
          onUserDrag?.({ ra: next.ra, dec: next.dec });
        }
      } else if (mode === 'ecliptic') {
        const sphereHits = raycaster.intersectObject(dragFullSphereMesh, false);
        if (sphereHits.length > 0) {
          if (eclipticView === 'sunpath') {
            celestialTiltGroup.updateWorldMatrix(true, false);
            const tiltPt = celestialTiltGroup.worldToLocal(
              sphereHits[0].point.clone()
            );
            const hourAngleRad = Math.atan2(-tiltPt.x, tiltPt.z);
            const hourAngleHours = ((hourAngleRad * 180) / Math.PI) / 15;
            const cDay = wrapCalendarDay(
              params.calendarDay ?? dayOffsetToCalendarDay(params.dayOfYear ?? 91)
            );
            const eotMin = computeEquationOfTimeMinutes(cDay);
            const nextTime = wrapHours(
              Math.round((12 + hourAngleHours - eotMin / 60) * 12) / 12
            );
            params.solarTime = nextTime;
            updateGeometryFromParams();
            onUserDrag?.({ solarTime: nextTime });
          } else {
            eclipticGroup.updateWorldMatrix(true, false);
            const localPt = eclipticGroup.worldToLocal(sphereHits[0].point.clone());
            const next = localCartesianToEcliptic(localPt.x, localPt.y, localPt.z);
            // Snap gently to β = 0° within ±2° so keeping object on the ecliptic feels natural
            const snappedBeta = Math.abs(next.beta) < 2.0 ? 0 : next.beta;
            params.eclipticLon = next.lambda;
            params.eclipticLat = snappedBeta;
            updateGeometryFromParams();
            onUserDrag?.({ eclipticLon: next.lambda, eclipticLat: snappedBeta });
          }
        }
      }
      return;
    }

    if (event.pointerType === 'mouse') {
      if (coordsLocked) {
        if (isHoveringStar) {
          isHoveringStar = false;
          getActiveHaloMesh().scale.setScalar(1.0);
        }
        renderer.domElement.style.cursor = 'grab';
        return;
      }
      const hits = raycaster.intersectObject(getActiveHitMesh(), false);
      let hovered = hits.length > 0;
      let hoveredPattern = false;
      if (!hovered && starPatternLayer) {
        const clickable = starPatternLayer.getClickableMeshes();
        if (clickable.length > 0) {
          hoveredPattern = raycaster.intersectObjects(clickable, false).length > 0;
        }
      }
      if (hovered !== isHoveringStar) {
        isHoveringStar = hovered;
        getActiveHaloMesh().scale.setScalar(hovered ? 1.2 : 1.0);
      }
      renderer.domElement.style.cursor =
        hovered || hoveredPattern ? 'pointer' : 'grab';
    }
  };

  const endStarDrag = (event: PointerEvent) => {
    if (isOrbitingSpaceView && event.pointerId === spaceOrbitPointerId) {
      isOrbitingSpaceView = false;
      spaceOrbitPointerId = null;
      controls.enabled = true;
      if (renderer) {
        renderer.domElement.style.cursor = 'grab';
        try {
          renderer.domElement.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore
        }
      }
      return;
    }

    if (!isDraggingStar || event.pointerId !== activePointerId) return;
    isDraggingStar = false;
    activePointerId = null;
    controls.enabled = true;
    starHaloMesh.scale.setScalar(1.0);
    eqStarHaloMesh.scale.setScalar(1.0);
    ecObjHaloMesh.scale.setScalar(1.0);
    sunHaloMesh.scale.setScalar(1.0);
    if (renderer) {
      renderer.domElement.style.cursor = 'grab';
      try {
        renderer.domElement.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore
      }
    }
  };

  if (isDraggableMode) {
    renderer.domElement.addEventListener('pointerdown', handlePointerDown, {
      capture: true,
    });
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', endStarDrag);
    renderer.domElement.addEventListener('pointercancel', endStarDrag);
  }

  // =========================================================================
  // Theme Sync
  // =========================================================================
  const applyScenePalette = (palette: SceneThemePalette, isDark: boolean) => {
    currentPalette = palette;
    currentIsDark = isDark;

    scene.background = new THREE.Color(palette.background);
    scene.fog = new THREE.FogExp2(palette.fog, 0.022);

    sphereWireMat.color.setHex(palette.sphereWireframe);
    sphereWireMat.opacity = palette.sphereWireframeOpacity * 0.72;
    updateGlassSpherePalette(sphereShellMat, isDark);

    const oldDiskMap = groundDiskMat.map;
    groundDiskMat.map = createCompassDiskTexture(
      hexNumberToCss(palette.horizon),
      hexNumberToCss(palette.groundFill),
      isDark,
      isEqRefHorizon
    );
    groundDiskMat.needsUpdate = true;
    oldDiskMap?.dispose();

    starMat.color.setHex(palette.starColor);
    starMat.opacity = palette.starOpacity;

    observerMat.color.setHex(palette.observerColor);
    ambientLight.color.setHex(palette.ambientLight);
    ambientLight.intensity = palette.ambientIntensity;

    // Horizon (Green)
    horizonRingMat.color.setHex(palette.horizon);
    zenithAxisMat.color.setHex(palette.horizon);
    poleDotMat.color.setHex(palette.horizon);
    meridianMat.color.setHex(palette.horizon);
    horizonArcMat.color.setHex(palette.horizon);
    altCircleMat.color.setHex(palette.horizon);
    altArcTubeMat.color.setHex(palette.horizon);
    altSectorMat.color.setHex(palette.horizon);
    zenithDistMat.color.setHex(palette.horizon);
    azArcTubeMat.color.setHex(palette.horizon);
    azSectorMat.color.setHex(palette.horizon);
    starHaloMat.color.setHex(palette.horizon);
    targetStarMat.color.setHex(isDark ? 0xffffff : 0x064e3b);
    targetStarMat.emissive.setHex(palette.horizon);

    // Equatorial (Sky Blue)
    equatorialRingMat.color.setHex(palette.equatorial);
    eqRefDiskMat.color.setHex(palette.equatorial);
    eqAxisMat.color.setHex(palette.equatorial);
    eqPoleDotMat.color.setHex(palette.equatorial);
    eqArcLineMat.color.setHex(palette.equatorial);
    eqTubeMat.color.setHex(palette.equatorial);
    eqSectorMat.color.setHex(palette.equatorial);
    decCircleMat.color.setHex(palette.equatorial);
    eqStarHaloMat.color.setHex(palette.equatorial);
    eqStarMat.color.setHex(isDark ? 0xffffff : 0x0c4a6e);
    eqStarMat.emissive.setHex(palette.equatorial);

    // Ecliptic (Warm refined gold/amber — crisp without heavy dark brown)
    const eclipticLineHex = isDark ? palette.ecliptic : 0xd97706;
    eclipticRingMat.color.setHex(eclipticLineHex);
    eclipticPlaneDiskMat.color.setHex(eclipticLineHex);
    eclipticAxisMat.color.setHex(eclipticLineHex);
    ecPoleDotMat.color.setHex(eclipticLineHex);
    ecArcLineMat.color.setHex(eclipticLineHex);
    ecTubeMat.color.setHex(eclipticLineHex);
    ecSectorMat.color.setHex(eclipticLineHex);
    ecLatCircleMat.color.setHex(eclipticLineHex);
    sunHaloMat.color.setHex(isDark ? 0xfde047 : 0xfbbf24);
    ecObjHaloMat.color.setHex(eclipticLineHex);
    ecObjMat.color.setHex(isDark ? 0xffffff : 0x713f12);
    ecObjMat.emissive.setHex(eclipticLineHex);
    sunMat.color.setHex(isDark ? 0xfef08a : 0xfbbf24);
    sunMat.emissive.setHex(isDark ? 0xfacc15 : 0xf59e0b);

    const badgeBg = isDark ? '#0f172a' : '#ffffff';
    for (const rec of spriteRecords) {
      const hex =
        rec.role === 'horizon'
          ? palette.horizon
          : rec.role === 'equatorial'
            ? palette.equatorial
            : palette.ecliptic;
      updateTextSprite(rec.sprite, rec.text, hexNumberToCss(hex), badgeBg, rec.wide);
    }
    refreshDynamicAngleSprites(true);
    applyCompareFocus();
    starTrailLayer?.applyPalette(palette, isDark);
    starPatternLayer?.applyPalette(palette, isDark);
    zoneCapsLayer?.applyPalette(palette, isDark);
    spaceView?.applyPalette(palette, isDark);
    sunMotionLayer?.applyPalette(palette, isDark);
  };

  const unsubTheme = themeManager.subscribe((state) => {
    applyScenePalette(
      themeManager.getScenePalette(state.resolved),
      state.resolved === 'dark'
    );
  });

  // =========================================================================
  // Demo Animations (Standard, Stepped with Waypoints & Continuous Sweep)
  // =========================================================================
  let demoActive = false;
  let demoStartTime = 0;
  let demoOnValues: ((values: Record<string, number>) => void) | null = null;
  let demoOnDone: (() => void) | null = null;
  const DEMO_DURATION_MS = 7500;

  interface SteppedDemoState {
    steps: DemoStepSpec[];
    stepIndex: number;
    waypointIndex: number;
    phase: 'transition' | 'hold' | 'sweep';
    phaseStart: number;
    fromValues: Record<string, number>;
    onValues: (values: Record<string, number>) => void;
    onStepChange: (stepIndex: number | null) => void;
    onDone: () => void;
  }

  let steppedDemo: SteppedDemoState | null = null;
  let singleTween: {
    start: number;
    duration: number;
    from: Record<string, number>;
    to: Record<string, number>;
    onValues: (values: Record<string, number>) => void;
    onDone?: () => void;
  } | null = null;

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const stopDemo = () => {
    demoActive = false;
    demoOnValues = null;
    demoOnDone = null;
    steppedDemo = null;
    singleTween = null;
  };

  const interpolateValues = (
    from: Record<string, number>,
    to: Record<string, number>,
    tVal: number,
    linearSweep = false
  ): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const key of Object.keys(to)) {
      const start = from[key] ?? to[key];
      const end = to[key];
      if (!linearSweep && (key === 'azimuth' || key === 'eclipticLon')) {
        let delta = end - start;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        out[key] = wrapAzimuth(start + delta * tVal);
      } else if (!linearSweep && (key === 'ra' || key === 'lst')) {
        let delta = end - start;
        if (delta > 12) delta -= 24;
        if (delta < -12) delta += 24;
        out[key] = wrapHours(start + delta * tVal);
      } else if (key === 'dayOfYear') {
        out[key] = Math.round(start + (end - start) * tVal);
      } else if (linearSweep && key === 'eclipticLon') {
        out[key] = wrapAzimuth(start + (end - start) * tVal);
      } else {
        out[key] = roundToOneDecimal(start + (end - start) * tVal);
      }
    }
    return out;
  };

  const beginStepAt = (state: SteppedDemoState, stepIndex: number, now: number) => {
    state.stepIndex = stepIndex;
    state.waypointIndex = 0;
    state.phaseStart = now;
    state.fromValues = { ...params };
    state.onStepChange(stepIndex);

    const step = state.steps[stepIndex];
    if (step?.sweep) {
      state.phase = 'sweep';
      Object.assign(params, step.sweep.from);
      updateGeometryFromParams();
      state.onValues({ ...step.sweep.from });
    } else {
      state.phase = 'transition';
    }
  };

  const startSteppedDemo = (
    steps: DemoStepSpec[],
    onValues: (values: Record<string, number>) => void,
    onStepChange: (stepIndex: number | null) => void,
    onDone: () => void
  ) => {
    stopDemo();
    if (siderealPlaying) {
      siderealPlaying = false;
      renderSiderealControls();
    }
    if (steps.length === 0) {
      onDone();
      return;
    }

    if (prefersReducedMotion()) {
      const first = steps[0];
      onStepChange(0);
      Object.assign(params, first.values);
      updateGeometryFromParams();
      onValues({ ...first.values });
      onDone();
      return;
    }

    const state: SteppedDemoState = {
      steps,
      stepIndex: 0,
      waypointIndex: 0,
      phase: 'transition',
      phaseStart: performance.now(),
      fromValues: { ...params },
      onValues,
      onStepChange,
      onDone,
    };
    steppedDemo = state;
    beginStepAt(state, 0, performance.now());
  };

  const animateToValues = (
    targetValues: Record<string, number>,
    onValues: (values: Record<string, number>) => void,
    onDone?: () => void
  ) => {
    stopDemo();
    if (siderealPlaying) {
      siderealPlaying = false;
      renderSiderealControls();
    }
    if (prefersReducedMotion()) {
      Object.assign(params, targetValues);
      updateGeometryFromParams();
      onValues({ ...targetValues });
      onDone?.();
      return;
    }
    singleTween = {
      start: performance.now(),
      duration: 750,
      from: { ...params },
      to: { ...targetValues },
      onValues,
      onDone,
    };
  };

  const startDemo = (
    onValues: (values: Record<string, number>) => void,
    onDone: () => void
  ) => {
    stopDemo();
    if (prefersReducedMotion()) {
      const snapshot: Record<string, number> =
        mode === 'horizon'
          ? { altitude: 30, azimuth: 90 }
          : mode === 'equatorial'
            ? { ra: 6, dec: 82, latitude: 14, lst: 12 }
            : mode === 'ecliptic'
              ? { eclipticLon: 90, eclipticLat: 0, obliquity: 23.5, dayOfYear: 91 }
              : { latitude: 35, lst: 135, eclipticLon: 120 };
      Object.assign(params, snapshot);
      updateGeometryFromParams();
      onValues(snapshot);
      onDone();
      return;
    }

    demoActive = true;
    demoStartTime = performance.now();
    demoOnValues = onValues;
    demoOnDone = onDone;
  };

  // =========================================================================
  // Resize Handling & Render Loop
  // =========================================================================
  const handleResize = () => {
    if (!renderer) return;
    const width = stage.clientWidth || 320;
    const height = stage.clientHeight || 320;
    if (dualView && spaceView) {
      if (width >= 640) {
        const halfW = Math.max(1, Math.floor(width / 2));
        spaceView.camera.aspect = halfW / height;
        spaceView.camera.updateProjectionMatrix();
        camera.aspect = Math.max(1, width - halfW) / height;
        camera.updateProjectionMatrix();
      } else {
        const halfH = Math.max(1, Math.floor(height / 2));
        spaceView.camera.aspect = width / halfH;
        spaceView.camera.updateProjectionMatrix();
        camera.aspect = width / Math.max(1, height - halfH);
        camera.updateProjectionMatrix();
      }
    } else {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    renderer.setSize(width, height, false);
  };

  if (isRotatingSkyMode) {
    dualViewSingleBtn?.addEventListener('click', () => {
      dualView = false;
      stage.className = isExpandedView()
        ? 'relative w-full flex-1 min-h-0'
        : `relative w-full ${heightClass}`;
      renderDualViewButtons();
      handleResize();
    });
    dualViewSplitBtn?.addEventListener('click', () => {
      dualView = true;
      stage.className = isExpandedView()
        ? 'relative w-full flex-1 min-h-0'
        : 'relative w-full h-[540px] sm:h-[460px] lg:h-[500px]';
      renderDualViewButtons();
      handleResize();
      updateGeometryFromParams();
    });

    for (const [m, btn] of trailButtons.entries()) {
      btn.addEventListener('click', () => {
        trailMode = m;
        starTrailLayer?.setMode(m);
        renderExplorerToolbar();
        updateGeometryFromParams();
      });
    }

    for (const [cid, btn] of constellationButtons.entries()) {
      btn.addEventListener('click', () => {
        activeConstellation = cid;
        starPatternLayer?.setConstellation(cid);
        renderExplorerToolbar();
        updateGeometryFromParams();
      });
    }

    zoneCapsBtn?.addEventListener('click', () => {
      zoneCapsEnabled = !zoneCapsEnabled;
      zoneCapsLayer?.setEnabled(zoneCapsEnabled);
      renderExplorerToolbar();
      updateGeometryFromParams();
    });

    const addStarsBtn = wrapper.querySelector<HTMLButtonElement>(
      '[data-action="add-random-stars"]'
    );
    addStarsBtn?.addEventListener('click', () => {
      const remaining = Math.max(0, 40 - extraStars.length);
      const count = Math.min(5, remaining);
      if (count > 0) {
        const added: CatalogStar[] = [];
        for (let i = 0; i < count; i++) {
          const raHours = Number((Math.random() * 24).toFixed(2));
          const decDeg = Number(
            ((Math.asin(2 * Math.random() - 1) * 180) / Math.PI).toFixed(1)
          );
          const num = extraStars.length + i + 1;
          added.push({
            id: `random-${num}`,
            name: { th: `ดาวสุ่ม ${num}`, en: `Star ${num}` },
            raHours,
            decDeg,
          });
        }
        extraStars = [...extraStars, ...added];
        starPatternLayer?.setExtraStars(extraStars);
        renderExplorerToolbar();
        updateGeometryFromParams();
      }
    });

    clearStarsBtn?.addEventListener('click', () => {
      extraStars = [];
      starPatternLayer?.setExtraStars(extraStars);
      renderExplorerToolbar();
      updateGeometryFromParams();
    });

    renderDualViewButtons();
    renderExplorerToolbar();
  }

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(stage);
  handleResize();

  applyLayerVisibility();
  applyHorizonHelpers();
  applyEquatorialHelpers();
  applyEclipticHelpers();
  applyCompareFocus();
  updateGeometryFromParams();

  const resetCamera = () => {
    camera.position.copy(defaultCameraPos);
    controls.target.set(0, 0, 0);
    controls.update();
    spaceView?.resetCamera();
  };

  const resetCamBtn = wrapper.querySelector<HTMLButtonElement>(
    '[data-action="reset-camera"]'
  );
  resetCamBtn?.addEventListener('click', resetCamera);

  let rafId = 0;
  let lastTime = performance.now();
  let lastTickNotify = 0;

  const renderCurrentFrame = () => {
    if (!renderer) return;
    const width = stage.clientWidth || 320;
    const height = stage.clientHeight || 320;
    if (dualView && spaceView) {
      renderer.setScissorTest(true);
      if (width >= 640) {
        const halfW = Math.floor(width / 2);
        renderer.setViewport(0, 0, halfW, height);
        renderer.setScissor(0, 0, halfW, height);
        renderer.render(spaceView.scene, spaceView.camera);

        renderer.setViewport(halfW, 0, width - halfW, height);
        renderer.setScissor(halfW, 0, width - halfW, height);
        renderer.render(scene, camera);
      } else {
        const halfH = Math.floor(height / 2);
        renderer.setViewport(0, height - halfH, width, halfH);
        renderer.setScissor(0, height - halfH, width, halfH);
        renderer.render(spaceView.scene, spaceView.camera);

        renderer.setViewport(0, 0, width, height - halfH);
        renderer.setScissor(0, 0, width, height - halfH);
        renderer.render(scene, camera);
      }
      renderer.setScissorTest(false);
    } else {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
      renderer.render(scene, camera);
    }
  };

  // =========================================================================
  // Fullscreen (Native API + CSS Full-Viewport Fallback) & Watermarked Capture
  // =========================================================================
  let prevBodyOverflow = '';

  const syncFullscreenLayout = () => {
    const expanded = isExpandedView();
    if (expanded) {
      wrapper.className = isCssFullscreen
        ? 'fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface'
        : 'relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-surface';
      stage.className = 'relative w-full flex-1 min-h-0';
      if (isCssFullscreen) {
        prevBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
    } else {
      wrapper.className =
        'relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm';
      stage.className = dualView
        ? 'relative w-full h-[540px] sm:h-[460px] lg:h-[500px]'
        : `relative w-full ${heightClass}`;
      document.body.style.overflow = prevBodyOverflow;
    }
    renderFullscreenButton();
    handleResize();
  };

  const handleFullscreenChange = () => {
    isNativeFullscreen = document.fullscreenElement === wrapper;
    if (!isNativeFullscreen && !isCssFullscreen) {
      syncFullscreenLayout();
    } else if (isNativeFullscreen) {
      isCssFullscreen = false;
      syncFullscreenLayout();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isCssFullscreen) {
      isCssFullscreen = false;
      syncFullscreenLayout();
    }
  };

  const toggleFullscreen = async () => {
    if (isNativeFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        isNativeFullscreen = false;
        syncFullscreenLayout();
      }
      return;
    }
    if (isCssFullscreen) {
      isCssFullscreen = false;
      syncFullscreenLayout();
      return;
    }

    const reqFs =
      wrapper.requestFullscreen ||
      (wrapper as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
        .webkitRequestFullscreen;
    if (typeof reqFs === 'function') {
      try {
        await reqFs.call(wrapper);
        isNativeFullscreen = document.fullscreenElement === wrapper;
        if (!isNativeFullscreen) {
          isCssFullscreen = true;
        }
        syncFullscreenLayout();
        return;
      } catch {
        // Fall back smoothly to CSS full-viewport overlay (e.g., iOS Safari)
      }
    }
    isCssFullscreen = true;
    syncFullscreenLayout();
  };

  const captureScreenshot = () => {
    if (!renderer) return;
    // Render synchronously right before copying WebGL canvas so image is never blank
    controls.update();
    renderCurrentFrame();

    const srcCanvas = renderer.domElement;
    const outW = srcCanvas.width;
    const outH = srcCanvas.height;
    if (outW <= 0 || outH <= 0) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(srcCanvas, 0, 0, outW, outH);

    const dpr = Math.max(1, outW / Math.max(1, stage.clientWidth || outW));

    // If Dual View is active, draw divider line & captions on exported PNG too
    if (dualView) {
      const horiz = (stage.clientWidth || outW) >= 640;
      ctx.save();
      ctx.strokeStyle = currentIsDark
        ? 'rgba(148, 163, 184, 0.45)'
        : 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = Math.max(1, Math.round(1.5 * dpr));
      ctx.beginPath();
      if (horiz) {
        ctx.moveTo(outW / 2, 0);
        ctx.lineTo(outW / 2, outH);
      } else {
        ctx.moveTo(0, outH / 2);
        ctx.lineTo(outW, outH / 2);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Bottom-right watermark: "CelestiaLab • ครูพี่นัท"
    const wmText = 'CelestiaLab • ครูพี่นัท';
    const fontSize = Math.max(13, Math.round(15 * dpr));
    const padX = Math.round(13 * dpr);
    const padY = Math.round(7 * dpr);
    const margin = Math.round(14 * dpr);
    const radius = Math.round(10 * dpr);

    ctx.save();
    ctx.font = `700 ${fontSize}px "Noto Sans Thai", system-ui, sans-serif`;
    const textW = ctx.measureText(wmText).width;
    const boxW = textW + padX * 2;
    const boxH = fontSize + padY * 2;
    const boxX = outW - boxW - margin;
    const boxY = outH - boxH - margin;

    ctx.fillStyle = currentIsDark
      ? 'rgba(15, 23, 42, 0.78)'
      : 'rgba(255, 255, 255, 0.84)';
    ctx.strokeStyle = currentIsDark
      ? 'rgba(148, 163, 184, 0.45)'
      : 'rgba(100, 116, 139, 0.38)';
    ctx.lineWidth = Math.max(1, Math.round(1.2 * dpr));
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, radius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = currentIsDark ? '#f8fafc' : '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(wmText, boxX + boxW / 2, boxY + boxH / 2 + dpr * 0.5);
    ctx.restore();

    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
    const filename = `celestialab-${mode}-${stamp}.png`;

    const triggerDownload = (url: string, revokeAfter = false) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revokeAfter) {
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      }
    };

    if (typeof outCanvas.toBlob === 'function') {
      outCanvas.toBlob((blob) => {
        if (!blob) {
          triggerDownload(outCanvas.toDataURL('image/png'));
          return;
        }
        triggerDownload(URL.createObjectURL(blob), true);
      }, 'image/png');
    } else {
      triggerDownload(outCanvas.toDataURL('image/png'));
    }

    if (captureBtn) {
      captureBtn.innerHTML = `${ICONS.check('w-3.5 h-3.5 shrink-0 text-horizon')}<span>${t.module.captureSaved}</span>`;
      if (captureFeedbackTimer !== null) {
        window.clearTimeout(captureFeedbackTimer);
      }
      captureFeedbackTimer = window.setTimeout(() => {
        if (captureBtn) {
          captureBtn.innerHTML = `${ICONS.capture('w-3.5 h-3.5 shrink-0')}<span>${t.module.captureImage}</span>`;
        }
        captureFeedbackTimer = null;
      }, 1800);
    }
  };

  fullscreenBtn?.addEventListener('click', () => {
    void toggleFullscreen();
  });
  captureBtn?.addEventListener('click', captureScreenshot);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  window.addEventListener('keydown', handleEscapeKey);

  const animate = (now: number) => {
    rafId = window.requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    starHaloMesh.lookAt(camera.position);
    eqStarHaloMesh.lookAt(camera.position);
    sunHaloMesh.lookAt(camera.position);
    ecObjHaloMesh.lookAt(camera.position);

    if (mode === 'hero' && !prefersReducedMotion()) {
      celestialSpinGroup.rotation.y -= dt * 0.24;
    }

    if ((mode === 'equatorial' || mode === 'compare') && siderealPlaying) {
      const nextLst = ((params.lst ?? 0) + dt * siderealSpeed) % 24;
      params.lst = nextLst;
      updateGeometryFromParams();
      if (now - lastTickNotify > 65) {
        lastTickNotify = now;
        onSiderealTick?.(wrapHours(nextLst));
      }
    }

    if (mode === 'ecliptic' && sunAnimPlaying) {
      let cDay = wrapCalendarDay(
        params.calendarDay ?? dayOffsetToCalendarDay(params.dayOfYear ?? 91)
      );
      let sTime = wrapHours(params.solarTime ?? 12);

      if (sunAnimMode === 'continuous') {
        sTime = wrapHours(sTime + dt * 2.4 * sunAnimSpeed);
        params.solarTime = sTime;
      } else {
        sunDayAccum += dt * 24 * sunAnimSpeed;
        if (sunDayAccum >= 1) {
          const step = Math.floor(sunDayAccum);
          sunDayAccum -= step;
          cDay = wrapCalendarDay(cDay + step);
          params.calendarDay = cDay;
          params.dayOfYear = calendarDayToDayOffset(cDay);
          params.eclipticLon = calendarDayToSunLambda(cDay);
        }
      }
      updateGeometryFromParams();
      if (now - lastTickNotify > 65) {
        lastTickNotify = now;
        onSunAnimTick?.({
          calendarDay: cDay,
          solarTime: sTime,
          eclipticLon: wrapAzimuth(params.eclipticLon ?? calendarDayToSunLambda(cDay)),
          dayOfYear: params.dayOfYear ?? calendarDayToDayOffset(cDay),
        });
      }
    }

    if (singleTween) {
      const p = Math.min((now - singleTween.start) / singleTween.duration, 1);
      const eased = 0.5 - Math.cos(p * Math.PI) / 2;
      const interp = interpolateValues(singleTween.from, singleTween.to, eased);
      Object.assign(params, interp);
      updateGeometryFromParams();
      singleTween.onValues(interp);
      if (p >= 1) {
        const done = singleTween.onDone;
        singleTween = null;
        done?.();
      }
    }

    if (steppedDemo) {
      const currentStep = steppedDemo.steps[steppedDemo.stepIndex];
      if (!currentStep) {
        const doneCb = steppedDemo.onDone;
        steppedDemo = null;
        doneCb();
      } else if (steppedDemo.phase === 'sweep' && currentStep.sweep) {
        const p = Math.min(
          (now - steppedDemo.phaseStart) / currentStep.sweep.durationMs,
          1
        );
        const interp = interpolateValues(
          currentStep.sweep.from,
          currentStep.sweep.to,
          p,
          true
        );
        Object.assign(params, interp);
        updateGeometryFromParams();
        steppedDemo.onValues(interp);
        if (p >= 1) {
          steppedDemo.phase = 'hold';
          steppedDemo.phaseStart = now;
        }
      } else if (steppedDemo.phase === 'transition') {
        const wp = currentStep.waypoints?.[steppedDemo.waypointIndex];
        const targetVals = wp ? wp.values : currentStep.values;
        const transDuration = wp?.transitionMs ?? 1000;
        const p = Math.min((now - steppedDemo.phaseStart) / transDuration, 1);
        const eased = 0.5 - Math.cos(p * Math.PI) / 2;
        const interp = interpolateValues(
          steppedDemo.fromValues,
          targetVals,
          eased
        );
        Object.assign(params, interp);
        updateGeometryFromParams();
        steppedDemo.onValues(interp);
        if (p >= 1) {
          steppedDemo.phase = 'hold';
          steppedDemo.phaseStart = now;
        }
      } else {
        const wp = currentStep.waypoints?.[steppedDemo.waypointIndex];
        const holdDuration = wp?.holdMs ?? currentStep.holdMs ?? 2400;
        if (now - steppedDemo.phaseStart >= holdDuration) {
          if (
            currentStep.waypoints &&
            steppedDemo.waypointIndex + 1 < currentStep.waypoints.length
          ) {
            steppedDemo.waypointIndex += 1;
            steppedDemo.phase = 'transition';
            steppedDemo.phaseStart = now;
            steppedDemo.fromValues = { ...params };
          } else {
            const nextIdx = steppedDemo.stepIndex + 1;
            if (nextIdx >= steppedDemo.steps.length) {
              const doneCb = steppedDemo.onDone;
              steppedDemo = null;
              doneCb();
            } else {
              beginStepAt(steppedDemo, nextIdx, now);
            }
          }
        }
      }
    }

    if (demoActive) {
      const elapsed = now - demoStartTime;
      const progress = Math.min(elapsed / DEMO_DURATION_MS, 1);
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;

      const updated: Record<string, number> = {};
      if (mode === 'horizon') {
        updated.altitude = Number((15 + Math.sin(progress * Math.PI) * 65).toFixed(1));
        updated.azimuth = Math.round((40 + eased * 290) % 360);
      } else if (mode === 'equatorial') {
        updated.ra = Number(((eased * 18 + 2) % 24).toFixed(1));
        updated.dec = Number((Math.sin(progress * Math.PI * 2) * 55).toFixed(1));
        updated.latitude = Number((14 + Math.sin(progress * Math.PI) * 45).toFixed(1));
      } else if (mode === 'ecliptic') {
        updated.eclipticLon = Math.round((progress * 360) % 360);
        updated.eclipticLat = 0;
      } else if (mode === 'compare') {
        updated.latitude = Number((13.8 + Math.sin(progress * Math.PI * 2) * 55).toFixed(1));
        updated.lst = Math.round((progress * 360) % 360);
        updated.eclipticLon = Math.round((60 + progress * 240) % 360);
      }

      Object.assign(params, updated);
      updateGeometryFromParams();
      demoOnValues?.(updated);

      if (progress >= 1) {
        const doneCb = demoOnDone;
        stopDemo();
        doneCb?.();
      }
    }

    controls.update();
    renderCurrentFrame();
  };

  rafId = window.requestAnimationFrame(animate);

  const dispose = () => {
    window.cancelAnimationFrame(rafId);
    stopDemo();
    unsubTheme();
    resizeObserver.disconnect();
    resetCamBtn?.removeEventListener('click', resetCamera);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    window.removeEventListener('keydown', handleEscapeKey);
    if (captureFeedbackTimer !== null) {
      window.clearTimeout(captureFeedbackTimer);
      captureFeedbackTimer = null;
    }
    if (isCssFullscreen) {
      document.body.style.overflow = prevBodyOverflow;
    }
    if (document.fullscreenElement === wrapper) {
      void document.exitFullscreen().catch(() => {});
    }

    if (isDraggableMode && renderer) {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown, {
        capture: true,
      });
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', endStarDrag);
      renderer.domElement.removeEventListener('pointercancel', endStarDrag);
    }

    controls.dispose();
    groundDiskMat.map?.dispose();
    starTrailLayer?.dispose();
    starPatternLayer?.dispose();
    zoneCapsLayer?.dispose();
    spaceView?.dispose();
    sunMotionLayer?.dispose();

    scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh ||
        obj instanceof THREE.Line ||
        obj instanceof THREE.Points
      ) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      } else if (obj instanceof THREE.Sprite) {
        const mat = obj.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });

    renderer?.dispose();
    renderer = null;
  };

  return {
    element: wrapper,
    setParams: (nextParams) => {
      Object.assign(params, nextParams);
      updateGeometryFromParams();
    },
    setLayerVisibility: (layer, visible) => {
      layerState[layer] = visible;
      applyLayerVisibility();
    },
    setHorizonHelperVisibility: (helper, visible) => {
      horizonHelpers[helper] = visible;
      applyHorizonHelpers();
    },
    setEquatorialHelperVisibility: (helper, visible) => {
      eqHelpers[helper] = visible;
      applyEquatorialHelpers();
    },
    setEclipticHelperVisibility: (helper, visible) => {
      ecHelpers[helper] = visible;
      applyEclipticHelpers();
    },
    setCompareFocus: (focus) => {
      compareFocus = focus;
      if (focus && !layerState[focus]) {
        layerState[focus] = true;
        applyLayerVisibility();
      }
      applyCompareFocus();
    },
    setSiderealPlaying: (playing) => {
      siderealPlaying = playing;
      renderSiderealControls();
    },
    setEclipticView: (view) => {
      setEclipticViewInternal(view);
    },
    setCoordsLocked: (locked) => {
      setCoordsLockedInternal(locked, false);
    },
    isCoordsLocked: () => coordsLocked,
    setSunAnimation: (st) => {
      sunAnimPlaying = st.playing;
      sunAnimMode = st.mode;
      sunAnimSpeed = st.speed;
      if (sunAnimPlaying) {
        stopDemo();
        if (st.mode === 'continuous' && eclipticView !== 'sunpath') {
          setEclipticViewInternal('sunpath');
        }
      }
    },
    startDemo,
    startSteppedDemo,
    animateToValues,
    stopDemo,
    resetCamera,
    dispose,
  };
}
