import { WORLD_CITIES } from '../astronomy/patterns';
import { roundToOneDecimal } from '../astronomy/horizon';
import { i18n } from '../i18n';
import { ICONS } from './Icons';

export interface EarthMapPickerOptions {
  initialLatitude: number;
  initialLongitude?: number;
  onLatitudeChange: (latitudeDeg: number, cityId?: string) => void;
}

export interface EarthMapPickerHandle {
  element: HTMLElement;
  setLatitude: (latitudeDeg: number, longitudeDeg?: number) => void;
  destroy: () => void;
}

// Calibrated to public/world-map.jpg (1024x724), cropped cleanly inside the outer frame
const IMG_W = 1024;
const IMG_H = 724;
const VB_X = 32;
const VB_Y = 96;
const VB_W = 960;
const VB_H = 598;

const Y_EQUATOR = 400;
const PX_PER_DEG_LAT = 3.24;
const X_PRIME_MERIDIAN = 444;
const PX_PER_DEG_LON = 2.98;

/** Mild Robinson-style horizontal compression matching world-map.jpg across all latitudes. */
function lonProjectionFactor(latDeg: number): number {
  return 0.56 + 0.44 * Math.cos((latDeg * Math.PI) / 180);
}

function lonToX(lonDeg: number, latDeg: number): number {
  const x = X_PRIME_MERIDIAN + lonDeg * PX_PER_DEG_LON * lonProjectionFactor(latDeg);
  return Math.max(VB_X + 12, Math.min(VB_X + VB_W - 12, x));
}

function latToY(latDeg: number): number {
  const y = Y_EQUATOR - latDeg * PX_PER_DEG_LAT;
  return Math.max(VB_Y + 8, Math.min(VB_Y + VB_H - 8, y));
}

function yToLat(y: number): number {
  const raw = (Y_EQUATOR - y) / PX_PER_DEG_LAT;
  return roundToOneDecimal(Math.max(-90, Math.min(90, raw)));
}

function xToLon(x: number, latDeg: number): number {
  const denom = PX_PER_DEG_LON * lonProjectionFactor(latDeg);
  const raw = (x - X_PRIME_MERIDIAN) / denom;
  return roundToOneDecimal(Math.max(-180, Math.min(180, raw)));
}

export function createEarthMapPicker(
  options: EarthMapPickerOptions
): EarthMapPickerHandle {
  const t = i18n.t().module.earthMap;
  let lat = roundToOneDecimal(options.initialLatitude);
  let lon = options.initialLongitude ?? 100.5; // Thailand default longitude

  const section = document.createElement('section');
  section.className =
    'rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-3';

  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-center justify-between gap-2';

  const title = document.createElement('h2');
  title.className = 'flex items-center gap-1.5 text-sm font-bold text-ink';
  title.innerHTML = `${ICONS.globe('w-4 h-4 text-equatorial shrink-0')}<span>${t.title}</span>`;

  const latBadge = document.createElement('span');
  latBadge.className =
    'rounded-lg border border-equatorial-border bg-equatorial-soft px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-equatorial';

  header.append(title, latBadge);

  const hint = document.createElement('p');
  hint.className = 'text-xs text-ink-muted leading-snug';
  hint.textContent = t.hint;

  // Interactive World Map using custom Thai world-map.jpg with calibrated latitude/longitude overlay
  const mapWrap = document.createElement('div');
  mapWrap.className =
    'relative overflow-hidden rounded-xl border border-line bg-subtle';

  const mapUrl = `${import.meta.env.BASE_URL}world-map.jpg`;
  const yTropicN = latToY(23.5).toFixed(1);
  const yTropicS = latToY(-23.5).toFixed(1);
  const yNorthPole = latToY(90).toFixed(1);
  const ySouthPole = latToY(-90).toFixed(1);

  mapWrap.innerHTML = `
    <svg data-earth-svg role="img" aria-label="${t.title}" viewBox="${VB_X} ${VB_Y} ${VB_W} ${VB_H}" class="block h-auto w-full select-none cursor-crosshair" style="touch-action: none;">
      <image
        href="${mapUrl}"
        x="0"
        y="0"
        width="${IMG_W}"
        height="${IMG_H}"
        class="dark:brightness-90 dark:contrast-105"
      />

      <!-- Subtle Tropics ±23.5° -->
      <g stroke="#d97706" stroke-width="2" stroke-dasharray="10 8" opacity="0.6">
        <line x1="${VB_X}" y1="${yTropicN}" x2="${VB_X + VB_W}" y2="${yTropicN}" />
        <line x1="${VB_X}" y1="${yTropicS}" x2="${VB_X + VB_W}" y2="${yTropicS}" />
      </g>

      <!-- Subtle Equator 0° -->
      <line x1="${VB_X}" y1="${Y_EQUATOR}" x2="${VB_X + VB_W}" y2="${Y_EQUATOR}" stroke="#0284c7" stroke-width="2.4" opacity="0.72" />

      <!-- Compact Latitude Scale Badges -->
      <g font-size="20" font-weight="700" font-family="JetBrains Mono, monospace">
        <rect x="${VB_X + 10}" y="${Number(yNorthPole) - 10}" width="64" height="26" rx="8" fill="rgba(255,255,255,0.85)" />
        <text x="${VB_X + 42}" y="${Number(yNorthPole) + 8}" text-anchor="middle" fill="#0f172a">90°N</text>

        <rect x="${VB_X + 10}" y="${Y_EQUATOR - 14}" width="42" height="26" rx="8" fill="rgba(255,255,255,0.85)" />
        <text x="${VB_X + 31}" y="${Y_EQUATOR + 5}" text-anchor="middle" fill="#0369a1">0°</text>

        <rect x="${VB_X + 10}" y="${Number(ySouthPole) - 24}" width="64" height="26" rx="8" fill="rgba(255,255,255,0.85)" />
        <text x="${VB_X + 42}" y="${Number(ySouthPole) - 6}" text-anchor="middle" fill="#0f172a">90°S</text>
      </g>

      <!-- Active Observer Latitude Band & Draggable Pin -->
      <line data-lat-line x1="${VB_X}" y1="${Y_EQUATOR}" x2="${VB_X + VB_W}" y2="${Y_EQUATOR}" stroke="#059669" stroke-width="3.2" stroke-dasharray="12 8" />
      <g data-observer-pin transform="translate(731, 356)">
        <circle r="22" fill="#10b981" opacity="0.28" />
        <circle r="11" fill="#059669" stroke="#ffffff" stroke-width="4" />
      </g>
    </svg>
  `;

  const svgEl = mapWrap.querySelector<SVGSVGElement>('[data-earth-svg]')!;
  const latLine = mapWrap.querySelector<SVGLineElement>('[data-lat-line]')!;
  const pinGroup = mapWrap.querySelector<SVGGElement>('[data-observer-pin]')!;

  // City quick-select pills
  const cityRow = document.createElement('div');
  cityRow.className = 'flex flex-wrap items-center gap-1.5';

  const cityButtons = new Map<string, HTMLButtonElement>();

  const updateVisuals = () => {
    const y = latToY(lat);
    const x = lonToX(lon, lat);
    latLine.setAttribute('y1', y.toFixed(1));
    latLine.setAttribute('y2', y.toFixed(1));
    pinGroup.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);

    const hemi = lat > 0.05 ? 'N' : lat < -0.05 ? 'S' : '';
    latBadge.textContent = `${Math.abs(lat).toFixed(1)}°${hemi}`;

    for (const city of WORLD_CITIES) {
      const btn = cityButtons.get(city.id);
      if (!btn) continue;
      const isNear = Math.abs(city.latDeg - lat) < 0.6;
      btn.setAttribute('aria-pressed', String(isNear));
      btn.className = isNear
        ? 'inline-flex items-center rounded-lg border border-horizon-border bg-horizon-soft px-2.5 py-1 text-[11px] font-bold text-horizon transition-colors'
        : 'inline-flex items-center rounded-lg border border-line bg-subtle px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
    }
  };

  for (const city of WORLD_CITIES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.cityPreset = city.id;
    const hemi = city.latDeg >= 0 ? 'N' : 'S';
    btn.textContent = `${i18n.pick(city.name)} (${Math.abs(city.latDeg).toFixed(0)}°${hemi})`;
    btn.addEventListener('click', () => {
      lat = roundToOneDecimal(city.latDeg);
      lon = city.lonDeg;
      updateVisuals();
      options.onLatitudeChange(lat, city.id);
    });
    cityButtons.set(city.id, btn);
    cityRow.appendChild(btn);
  }

  // Pointer drag on SVG map
  let dragging = false;

  const pickFromClient = (clientX: number, clientY: number) => {
    const rect = svgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const svgX = VB_X + ((clientX - rect.left) / rect.width) * VB_W;
    const svgY = VB_Y + ((clientY - rect.top) / rect.height) * VB_H;
    lat = yToLat(svgY);
    lon = xToLon(svgX, lat);
    updateVisuals();
    options.onLatitudeChange(lat);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true;
    svgEl.setPointerCapture(e.pointerId);
    pickFromClient(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    pickFromClient(e.clientX, e.clientY);
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    try {
      svgEl.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  svgEl.addEventListener('pointerdown', onPointerDown);
  svgEl.addEventListener('pointermove', onPointerMove);
  svgEl.addEventListener('pointerup', onPointerEnd);
  svgEl.addEventListener('pointercancel', onPointerEnd);

  section.append(header, hint, mapWrap, cityRow);
  updateVisuals();

  return {
    element: section,
    setLatitude: (nextLat: number, nextLon?: number) => {
      lat = roundToOneDecimal(Math.max(-90, Math.min(90, nextLat)));
      if (typeof nextLon === 'number') lon = nextLon;
      updateVisuals();
    },
    destroy: () => {
      svgEl.removeEventListener('pointerdown', onPointerDown);
      svgEl.removeEventListener('pointermove', onPointerMove);
      svgEl.removeEventListener('pointerup', onPointerEnd);
      svgEl.removeEventListener('pointercancel', onPointerEnd);
    },
  };
}
