import type { ModuleDefinition, SliderSpec } from '../data/modules';
import {
  DEFAULT_OBLIQUITY_COMPARE,
  PRESET_STARS,
  resolveCompareCoords,
  roundCompareDisplay,
  type CompareCoords,
  type CoordinateSystemId,
  type PresetStar,
} from '../astronomy/compare';
import { formatHoursMinutes } from '../astronomy/equatorial';
import { i18n } from '../i18n';
import { createSkyScene } from '../components/SkyScene';
import {
  createControlPanel,
  type ControlPanelHandle,
} from '../components/ControlPanel';
import { createEarthMapPicker } from '../components/EarthMapPicker';
import { createTryItButton } from '../components/TryItButton';
import { ICONS } from '../components/Icons';

export interface CompareWorkspaceHandle {
  element: HTMLElement;
  dispose: () => void;
}

const SOURCE_SLIDERS: Record<CoordinateSystemId, SliderSpec[]> = {
  horizon: [
    {
      id: 'altitude',
      label: { th: 'มุมเงย (a / Altitude)', en: 'Altitude (a)' },
      description: {
        th: '−90° ถึง +90° (ค่าบวกเหนือขอบฟ้า, ค่าลบใต้ขอบฟ้า)',
        en: '−90° to +90° (positive above horizon, negative below horizon)',
      },
      min: -90,
      max: 90,
      step: 0.1,
      defaultValue: 45,
      unit: '°',
      accent: 'horizon',
      format: 'signed-deg',
      numberInput: true,
      buttonStep: 1,
      rangeErrorMessage: {
        th: 'มุมเงย (a) ต้องอยู่ระหว่าง −90° ถึง +90°',
        en: 'Altitude (a) must be between −90° and +90°',
      },
    },
    {
      id: 'azimuth',
      label: { th: 'มุมทิศ (A / Azimuth)', en: 'Azimuth (A)' },
      description: {
        th: '0°–360° วัดจากทิศเหนือไปทางตะวันออก (360° = 0°)',
        en: '0°–360° measured clockwise from North toward East (360° = 0°)',
      },
      min: 0,
      max: 360,
      step: 0.1,
      defaultValue: 120,
      unit: '°',
      accent: 'horizon',
      format: 'deg',
      numberInput: true,
      wrapAtMax: true,
      buttonStep: 1,
      rangeErrorMessage: {
        th: 'มุมทิศ (A) ต้องอยู่ระหว่าง 0°–360°',
        en: 'Azimuth (A) must be between 0°–360°',
      },
    },
  ],
  equatorial: [
    {
      id: 'ra',
      label: { th: 'ไรต์แอสเซนชัน (RA, α)', en: 'Right Ascension (RA, α)' },
      description: {
        th: '0h–24h จากจุดวสันตวิษุวัต (24h = 0h)',
        en: '0h–24h from the Vernal Equinox (24h = 0h)',
      },
      min: 0,
      max: 24,
      step: 0.01,
      defaultValue: 6,
      unit: 'h',
      accent: 'equatorial',
      format: 'ra-hours',
      numberInput: true,
      wrapAtMax: true,
      buttonStep: 1,
      rangeErrorMessage: {
        th: 'ไรต์แอสเซนชัน (RA) ต้องอยู่ระหว่าง 0–24 ชั่วโมง',
        en: 'Right Ascension (RA) must be between 0–24 hours',
      },
    },
    {
      id: 'dec',
      label: { th: 'เดคลิเนชัน (Dec, δ)', en: 'Declination (Dec, δ)' },
      description: {
        th: '−90° ถึง +90° เหนือ/ใต้เส้นศูนย์สูตรฟ้า',
        en: '−90° to +90° north/south of the Celestial Equator',
      },
      min: -90,
      max: 90,
      step: 0.1,
      defaultValue: 23.4,
      unit: '°',
      accent: 'equatorial',
      format: 'signed-deg',
      numberInput: true,
      buttonStep: 1,
      rangeErrorMessage: {
        th: 'เดคลิเนชัน (Dec) ต้องอยู่ระหว่าง −90° ถึง +90°',
        en: 'Declination (Dec) must be between −90° and +90°',
      },
    },
  ],
  ecliptic: [
    {
      id: 'eclipticLon',
      label: { th: 'ลองจิจูดสุริยะวิถี (λ)', en: 'Ecliptic Longitude (λ)' },
      description: {
        th: '0°–360° วัดจากจุดวสันตวิษุวัต (360° = 0°)',
        en: '0°–360° eastward from the Vernal Equinox (360° = 0°)',
      },
      min: 0,
      max: 360,
      step: 0.1,
      defaultValue: 90,
      unit: '°',
      accent: 'ecliptic',
      format: 'deg',
      numberInput: true,
      wrapAtMax: true,
      buttonStep: 1,
      rangeErrorMessage: {
        th: 'ลองจิจูดสุริยะวิถี (λ) ต้องอยู่ระหว่าง 0°–360°',
        en: 'Ecliptic longitude (λ) must be between 0°–360°',
      },
    },
    {
      id: 'eclipticLat',
      label: { th: 'ละติจูดสุริยะวิถี (β)', en: 'Ecliptic Latitude (β)' },
      description: {
        th: '−90° ถึง +90° เหนือ/ใต้ระนาบสุริยะวิถี',
        en: '−90° to +90° north/south of the Ecliptic plane',
      },
      min: -90,
      max: 90,
      step: 0.1,
      defaultValue: 0,
      unit: '°',
      accent: 'ecliptic',
      format: 'signed-deg',
      numberInput: true,
      buttonStep: 1,
      rangeErrorMessage: {
        th: 'ละติจูดสุริยะวิถี (β) ต้องอยู่ระหว่าง −90° ถึง +90°',
        en: 'Ecliptic latitude (β) must be between −90° and +90°',
      },
    },
  ],
};

function formatSignedDeg(val: number): string {
  const sign = val > 0.04 ? '+' : val < -0.04 ? '−' : '';
  return `${sign}${Math.abs(val).toFixed(1)}°`;
}

export function createCompareModuleWorkspace(
  mod: ModuleDefinition
): CompareWorkspaceHandle {
  const t = i18n.t();
  const cui = t.module.compareUi;
  const locale = i18n.getLocale();

  const workspaceOuter = document.createElement('div');
  workspaceOuter.className = 'module-grid-container';

  const workspace = document.createElement('div');
  workspace.className = 'module-workspace-layout space-y-6 lg:space-y-0';

  // Canonical full-precision state (starts at Betelgeuse or Horizon 45°/120°)
  let activeSource: CoordinateSystemId = 'equatorial';
  let activePresetId: string | null = 'sun';
  let sunLambda = 90;

  let state: CompareCoords = resolveCompareCoords(
    'ecliptic',
    {
      eclipticLon: 90,
      eclipticLat: 0,
      latitude: 14,
      lst: 8,
      obliquity: DEFAULT_OBLIQUITY_COMPARE,
    },
    locale
  );

  // =========================================================================
  // 1) 3D SkyScene (Compare Mode with all 3 overlaid systems + Focus Mode + LST Play)
  // =========================================================================
  let setCompareLocked = (_locked: boolean) => {};

  const skyScene = createSkyScene({
    mode: 'compare',
    showLayerToggles: true,
    showControlsBar: true,
    onLockChange: (locked) => {
      setCompareLocked(locked);
    },
    initialParams: {
      altitude: state.altitude,
      azimuth: state.azimuth,
      ra: state.ra,
      dec: state.dec,
      eclipticLon: state.eclipticLon,
      eclipticLat: state.eclipticLat,
      latitude: state.latitude,
      lst: state.lst,
      obliquity: state.obliquity,
      sunLambda,
    },
    onUserDrag: (dragged) => {
      if (tryItButton.isPlaying()) {
        tryItButton.setPlaying(false);
      }
      tryItButton.setActiveStep(null);
      activePresetId = null;
      renderPresetButtons();
      state = resolveCompareCoords(
        'equatorial',
        {
          ra: dragged.ra ?? state.ra,
          dec: dragged.dec ?? state.dec,
          latitude: state.latitude,
          lst: state.lst,
          obliquity: state.obliquity,
        },
        locale
      );
      syncAllUI(true);
    },
    onSiderealTick: (nextLst) => {
      // Keep canonical (RA, Dec) fixed so ONLY Horizon (a, A) updates!
      state = resolveCompareCoords(
        'equatorial',
        {
          ra: state.ra,
          dec: state.dec,
          latitude: state.latitude,
          lst: nextLst,
          obliquity: state.obliquity,
        },
        locale
      );
      syncAllUI(true, 'lst-tick');
    },
  });

  // =========================================================================
  // 2) Live 3-System Comparison Summary Table (placed directly under 3D Scene!)
  // =========================================================================
  const tableCard = document.createElement('section');
  tableCard.className =
    'rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm space-y-3';

  const tableHeader = document.createElement('div');
  tableHeader.className = 'flex flex-wrap items-center justify-between gap-2';
  tableHeader.innerHTML = `
    <h2 class="text-base font-bold text-ink">${cui.summaryTableHeading}</h2>
    <span class="text-[11px] font-medium text-ink-muted">${cui.dragHint}</span>
  `;

  const tableScroll = document.createElement('div');
  tableScroll.className = 'overflow-x-auto rounded-xl border border-line';
  tableScroll.tabIndex = 0;
  tableScroll.setAttribute('role', 'region');
  tableScroll.setAttribute('aria-label', cui.summaryTableHeading);

  tableScroll.innerHTML = `
    <table class="w-full min-w-[32rem] border-collapse text-left text-xs sm:text-sm">
      <caption class="sr-only">${cui.summaryTableCaption}</caption>
      <thead class="border-b border-line bg-subtle text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
        <tr>
          <th scope="col" class="px-3.5 py-2.5">${cui.colSystem}</th>
          <th scope="col" class="px-3.5 py-2.5">${cui.colPrimary}</th>
          <th scope="col" class="px-3.5 py-2.5">${cui.colSecondary}</th>
          <th scope="col" class="px-3.5 py-2.5">${cui.colBehavior}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        <tr data-compare-row="horizon" class="transition-colors">
          <th scope="row" class="px-3.5 py-3 font-semibold whitespace-nowrap">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-horizon-border bg-horizon-soft px-2.5 py-0.5 text-xs font-semibold text-horizon">
              ${ICONS.horizon('w-3.5 h-3.5')}
              <span>${t.systems.horizon.shortName}</span>
            </span>
          </th>
          <td data-cell="horizon-primary" class="px-3.5 py-3 font-mono font-bold tabular-nums text-ink whitespace-nowrap"></td>
          <td data-cell="horizon-secondary" class="px-3.5 py-3 text-xs text-ink-secondary"></td>
          <td class="px-3.5 py-3">
            <span class="inline-flex items-center gap-1 rounded-lg border border-horizon-border bg-horizon-soft px-2 py-0.5 text-[11px] font-semibold text-horizon">
              ${ICONS.reset('w-3 h-3 shrink-0')}
              <span>${cui.behaviorDynamic}</span>
            </span>
          </td>
        </tr>
        <tr data-compare-row="equatorial" class="transition-colors">
          <th scope="row" class="px-3.5 py-3 font-semibold whitespace-nowrap">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-equatorial-border bg-equatorial-soft px-2.5 py-0.5 text-xs font-semibold text-equatorial">
              ${ICONS.equatorial('w-3.5 h-3.5')}
              <span>${t.systems.equatorial.shortName}</span>
            </span>
          </th>
          <td data-cell="equatorial-primary" class="px-3.5 py-3 font-mono font-bold tabular-nums text-ink whitespace-nowrap"></td>
          <td data-cell="equatorial-secondary" class="px-3.5 py-3 text-xs text-ink-secondary"></td>
          <td class="px-3.5 py-3">
            <span class="inline-flex items-center gap-1 rounded-lg border border-equatorial-border bg-equatorial-soft px-2 py-0.5 text-[11px] font-semibold text-equatorial">
              ${ICONS.check('w-3 h-3 shrink-0')}
              <span>${cui.behaviorFixedEq}</span>
            </span>
          </td>
        </tr>
        <tr data-compare-row="ecliptic" class="transition-colors">
          <th scope="row" class="px-3.5 py-3 font-semibold whitespace-nowrap">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-ecliptic-border bg-ecliptic-soft px-2.5 py-0.5 text-xs font-semibold text-ecliptic">
              ${ICONS.ecliptic('w-3.5 h-3.5')}
              <span>${t.systems.ecliptic.shortName}</span>
            </span>
          </th>
          <td data-cell="ecliptic-primary" class="px-3.5 py-3 font-mono font-bold tabular-nums text-ink whitespace-nowrap"></td>
          <td data-cell="ecliptic-secondary" class="px-3.5 py-3 text-xs text-ink-secondary"></td>
          <td class="px-3.5 py-3">
            <span class="inline-flex items-center gap-1 rounded-lg border border-ecliptic-border bg-ecliptic-soft px-2 py-0.5 text-[11px] font-semibold text-ecliptic">
              ${ICONS.check('w-3 h-3 shrink-0')}
              <span>${cui.behaviorFixedEc}</span>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  tableCard.append(tableHeader, tableScroll);

  const rowHorizon = tableScroll.querySelector<HTMLTableRowElement>('[data-compare-row="horizon"]')!;
  const rowEquatorial = tableScroll.querySelector<HTMLTableRowElement>('[data-compare-row="equatorial"]')!;
  const rowEcliptic = tableScroll.querySelector<HTMLTableRowElement>('[data-compare-row="ecliptic"]')!;

  const cellHorizonPrimary = tableScroll.querySelector<HTMLElement>('[data-cell="horizon-primary"]')!;
  const cellHorizonSecondary = tableScroll.querySelector<HTMLElement>('[data-cell="horizon-secondary"]')!;
  const cellEqPrimary = tableScroll.querySelector<HTMLElement>('[data-cell="equatorial-primary"]')!;
  const cellEqSecondary = tableScroll.querySelector<HTMLElement>('[data-cell="equatorial-secondary"]')!;
  const cellEcPrimary = tableScroll.querySelector<HTMLElement>('[data-cell="ecliptic-primary"]')!;
  const cellEcSecondary = tableScroll.querySelector<HTMLElement>('[data-cell="ecliptic-secondary"]')!;

  let prevRendered = { horizon: '', equatorial: '', ecliptic: '' };

  const flashRow = (row: HTMLTableRowElement) => {
    row.classList.remove('compare-row-changed');
    // Trigger reflow to restart animation smoothly
    void row.offsetWidth;
    row.classList.add('compare-row-changed');
  };

  const renderSummaryTable = (allowHighlight: boolean) => {
    const disp = roundCompareDisplay(state);
    const hzText = `a = ${formatSignedDeg(disp.altitude)} • A = ${disp.azimuth.toFixed(1)}°`;
    const eqText = `RA ${formatHoursMinutes(state.ra, locale)} • Dec ${formatSignedDeg(state.dec)}`;
    const ecText = `λ = ${disp.eclipticLon.toFixed(1)}° • β = ${formatSignedDeg(disp.eclipticLat)}`;

    cellHorizonPrimary.textContent = hzText;
    const visText = state.isAboveHorizon
      ? t.module.aboveHorizonTag
      : t.module.belowHorizonTag;
    cellHorizonSecondary.textContent = `${state.compassName} (${state.compassCode}) • ${visText}`;

    cellEqPrimary.textContent = eqText;
    cellEqSecondary.textContent = `H = ${formatHoursMinutes(state.hourAngleHours, locale, true)} (${formatSignedDeg(state.hourAngleDeg)})`;

    cellEcPrimary.textContent = ecText;
    cellEcSecondary.textContent = `ε = ${state.obliquity.toFixed(2)}°`;

    if (allowHighlight) {
      if (prevRendered.horizon && prevRendered.horizon !== hzText) {
        flashRow(rowHorizon);
      }
      if (prevRendered.equatorial && prevRendered.equatorial !== eqText) {
        flashRow(rowEquatorial);
      }
      if (prevRendered.ecliptic && prevRendered.ecliptic !== ecText) {
        flashRow(rowEcliptic);
      }
    }

    prevRendered = { horizon: hzText, equatorial: eqText, ecliptic: ecText };
  };

  // =========================================================================
  // 3) Preset Celestial Objects Bar (6 Presets)
  // =========================================================================
  const presetCard = document.createElement('section');
  presetCard.className =
    'rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm space-y-3';

  const presetTitle = document.createElement('h2');
  presetTitle.className = 'text-sm font-bold text-ink';
  presetTitle.textContent = cui.presetHeading;

  const presetGrid = document.createElement('div');
  presetGrid.className = 'grid grid-cols-2 gap-2';

  const presetButtons = new Map<string, HTMLButtonElement>();

  const renderPresetButtons = () => {
    for (const [id, btn] of presetButtons.entries()) {
      const isActive = activePresetId === id;
      btn.setAttribute('aria-pressed', String(isActive));
      btn.className = isActive
        ? 'flex flex-col items-start rounded-xl border border-equatorial-border bg-equatorial-soft px-3 py-2 text-left shadow-sm transition-colors'
        : 'flex flex-col items-start rounded-xl border border-line bg-subtle px-3 py-2 text-left hover:border-line-strong hover:bg-elevated transition-colors';
    }
  };

  const applyPreset = (preset: PresetStar) => {
    skyScene.stopDemo();
    tryItButton.setPlaying(false);
    tryItButton.setActiveStep(null);
    activePresetId = preset.id;
    renderPresetButtons();

    if (preset.isSun) {
      sunLambda = preset.eclipticLon ?? 90;
      setActiveTab('ecliptic');
      state = resolveCompareCoords(
        'ecliptic',
        {
          eclipticLon: sunLambda,
          eclipticLat: 0,
          latitude: state.latitude,
          lst: state.lst,
          obliquity: state.obliquity,
        },
        locale
      );
    } else {
      setActiveTab('equatorial');
      state = resolveCompareCoords(
        'equatorial',
        {
          ra: preset.raHours ?? 6,
          dec: preset.decDeg ?? 0,
          latitude: state.latitude,
          lst: state.lst,
          obliquity: state.obliquity,
        },
        locale
      );
    }
    syncAllUI(true);
  };

  for (const preset of PRESET_STARS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.presetStar = preset.id;
    btn.innerHTML = `
      <span class="text-xs font-bold text-ink">${i18n.pick(preset.name)}</span>
      <span class="font-mono text-[11px] text-ink-muted tabular-nums">${i18n.pick(preset.subtitle)}</span>
    `;
    btn.addEventListener('click', () => applyPreset(preset));
    presetButtons.set(preset.id, btn);
    presetGrid.appendChild(btn);
  }
  renderPresetButtons();
  presetCard.append(presetTitle, presetGrid);

  // =========================================================================
  // 4) 3-Tab Source System Switcher + Reusable ControlPanels
  // =========================================================================
  const sourceCard = document.createElement('section');
  sourceCard.className =
    'rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm space-y-3';

  const sourceHeader = document.createElement('div');
  sourceHeader.className = 'space-y-1';
  sourceHeader.innerHTML = `
    <h2 class="text-base font-bold text-ink">${cui.sourceTabsHeading}</h2>
    <p class="text-xs text-ink-muted">${cui.sourceTabsHint}</p>
  `;

  const tabList = document.createElement('div');
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', cui.sourceTabsHeading);
  tabList.className =
    'grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-subtle p-1';

  const tabOrder: CoordinateSystemId[] = ['horizon', 'equatorial', 'ecliptic'];
  const tabButtons = new Map<CoordinateSystemId, HTMLButtonElement>();
  const tabPanels = new Map<CoordinateSystemId, HTMLDivElement>();
  const sourcePanels = new Map<CoordinateSystemId, ControlPanelHandle>();

  const tabMeta: Record<
    CoordinateSystemId,
    { label: string; activeCls: string; icon: string }
  > = {
    horizon: {
      label: t.systems.horizon.shortName,
      activeCls:
        'bg-horizon text-horizon-contrast shadow-sm font-bold',
      icon: ICONS.horizon('w-3.5 h-3.5 shrink-0'),
    },
    equatorial: {
      label: t.systems.equatorial.shortName,
      activeCls:
        'bg-equatorial text-equatorial-contrast shadow-sm font-bold',
      icon: ICONS.equatorial('w-3.5 h-3.5 shrink-0'),
    },
    ecliptic: {
      label: t.systems.ecliptic.shortName,
      activeCls:
        'bg-ecliptic text-ecliptic-contrast shadow-sm font-bold',
      icon: ICONS.ecliptic('w-3.5 h-3.5 shrink-0'),
    },
  };

  const setActiveTab = (nextTab: CoordinateSystemId) => {
    activeSource = nextTab;
    for (const sysId of tabOrder) {
      const btn = tabButtons.get(sysId)!;
      const panel = tabPanels.get(sysId)!;
      const selected = sysId === nextTab;
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
      btn.className = selected
        ? `inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors ${tabMeta[sysId].activeCls}`
        : 'inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-surface/60 transition-colors';
      panel.hidden = !selected;
    }
  };

  const panelsHost = document.createElement('div');
  const dispInit = roundCompareDisplay(state);

  for (const sysId of tabOrder) {
    const tabId = `compare-tab-${sysId}`;
    const panelId = `compare-panel-${sysId}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = tabId;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', panelId);
    btn.dataset.sourceTab = sysId;
    btn.innerHTML = `${tabMeta[sysId].icon}<span class="truncate">${tabMeta[sysId].label}</span>`;
    btn.addEventListener('click', () => setActiveTab(sysId));
    btn.addEventListener('keydown', (e) => {
      const idx = tabOrder.indexOf(sysId);
      let nextIdx = -1;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabOrder.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabOrder.length) % tabOrder.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = tabOrder.length - 1;
      if (nextIdx >= 0) {
        e.preventDefault();
        const nextId = tabOrder[nextIdx];
        setActiveTab(nextId);
        tabButtons.get(nextId)?.focus();
      }
    });
    tabButtons.set(sysId, btn);
    tabList.appendChild(btn);

    const panelWrap = document.createElement('div');
    panelWrap.id = panelId;
    panelWrap.setAttribute('role', 'tabpanel');
    panelWrap.setAttribute('aria-labelledby', tabId);

    const cp = createControlPanel({
      title: tabMeta[sysId].label,
      sliders: SOURCE_SLIDERS[sysId],
      initialValues: dispInit,
      onLockChange: (locked) => {
        setCompareLocked(locked);
      },
      onChange: (vals) => {
        if (tryItButton.isPlaying()) {
          skyScene.stopDemo();
          tryItButton.setPlaying(false);
          tryItButton.setActiveStep(null);
        }
        activePresetId = null;
        renderPresetButtons();
        if (sysId === 'ecliptic' && Math.abs(vals.eclipticLat ?? 0) < 0.05) {
          sunLambda = vals.eclipticLon ?? sunLambda;
        }
        state = resolveCompareCoords(
          sysId,
          {
            ...vals,
            latitude: state.latitude,
            lst: state.lst,
            obliquity: state.obliquity,
          },
          locale
        );
        syncAllUI(true, sysId);
      },
      onReset: (resetVals) => {
        activePresetId = null;
        renderPresetButtons();
        state = resolveCompareCoords(
          sysId,
          {
            ...resetVals,
            latitude: state.latitude,
            lst: state.lst,
            obliquity: state.obliquity,
          },
          locale
        );
        syncAllUI(true, sysId);
      },
    });
    // Remove duplicate outer card chrome so ControlPanel sits seamlessly inside the tabbed card
    cp.element.className = 'pt-1';

    sourcePanels.set(sysId, cp);
    panelWrap.appendChild(cp.element);
    tabPanels.set(sysId, panelWrap);
    panelsHost.appendChild(panelWrap);
  }

  setActiveTab(activeSource);
  sourceCard.append(sourceHeader, tabList, panelsHost);

  // =========================================================================
  // 5) Shared Parameters ControlPanel (φ Latitude, LST, ε Obliquity)
  // =========================================================================
  const sharedPanel = createControlPanel({
    title: cui.sharedParamsHeading,
    sliders: mod.sliders,
    onLockChange: (locked) => {
      setCompareLocked(locked);
    },
    initialValues: {
      latitude: state.latitude,
      lst: state.lst,
      obliquity: state.obliquity,
    },
    onChange: (vals, changedId) => {
      if (tryItButton.isPlaying()) {
        skyScene.stopDemo();
        tryItButton.setPlaying(false);
        tryItButton.setActiveStep(null);
      }
      if (changedId === 'lst') {
        skyScene.setSiderealPlaying(false);
      }
      // Keep Equatorial (RA, Dec) canonical when φ, LST, or ε changes
      // (If Sun preset is active and ε changed, keep Sun on ecliptic β=0°)
      if (changedId === 'obliquity' && activePresetId === 'sun') {
        state = resolveCompareCoords(
          'ecliptic',
          {
            eclipticLon: sunLambda,
            eclipticLat: 0,
            latitude: vals.latitude,
            lst: vals.lst,
            obliquity: vals.obliquity,
          },
          locale
        );
      } else {
        state = resolveCompareCoords(
          'equatorial',
          {
            ra: state.ra,
            dec: state.dec,
            latitude: vals.latitude,
            lst: vals.lst,
            obliquity: vals.obliquity,
          },
          locale
        );
      }
      syncAllUI(true, 'shared');
    },
    onReset: (resetVals) => {
      skyScene.stopDemo();
      skyScene.setSiderealPlaying(false);
      tryItButton.setPlaying(false);
      tryItButton.setActiveStep(null);
      state = resolveCompareCoords(
        'equatorial',
        {
          ra: state.ra,
          dec: state.dec,
          latitude: resetVals.latitude,
          lst: resetVals.lst,
          obliquity: resetVals.obliquity,
        },
        locale
      );
      syncAllUI(true, 'shared');
    },
  });

  // =========================================================================
  // 5b) Interactive Earth Map Latitude Picker (synced with φ Latitude)
  // =========================================================================
  const earthMapPicker = createEarthMapPicker({
    initialLatitude: state.latitude,
    onLatitudeChange: (nextLat) => {
      if (tryItButton.isPlaying()) {
        skyScene.stopDemo();
        tryItButton.setPlaying(false);
        tryItButton.setActiveStep(null);
      }
      state = resolveCompareCoords(
        'equatorial',
        {
          ra: state.ra,
          dec: state.dec,
          latitude: nextLat,
          lst: state.lst,
          obliquity: state.obliquity,
        },
        locale
      );
      syncAllUI(true, 'earth-map');
    },
  });

  // =========================================================================
  // Sync Helper (keeps 3D Scene, all 3 Tab Panels, Shared Panel & Table aligned)
  // =========================================================================
  const syncAllUI = (
    highlightChanges: boolean,
    skipPanel?: CoordinateSystemId | 'shared' | 'lst-tick' | 'earth-map'
  ) => {
    const disp = roundCompareDisplay(state);

    if (skipPanel !== 'horizon') {
      sourcePanels.get('horizon')?.setValues(
        { altitude: disp.altitude, azimuth: disp.azimuth },
        true
      );
    }
    if (skipPanel !== 'equatorial') {
      sourcePanels.get('equatorial')?.setValues(
        { ra: state.ra, dec: disp.dec },
        true
      );
    }
    if (skipPanel !== 'ecliptic') {
      sourcePanels.get('ecliptic')?.setValues(
        { eclipticLon: disp.eclipticLon, eclipticLat: disp.eclipticLat },
        true
      );
    }
    if (skipPanel !== 'shared') {
      sharedPanel.setValues(
        {
          latitude: state.latitude,
          lst: state.lst,
          obliquity: state.obliquity,
        },
        true
      );
    }
    if (skipPanel !== 'earth-map') {
      earthMapPicker.setLatitude(state.latitude);
    }

    skyScene.setParams({
      altitude: state.altitude,
      azimuth: state.azimuth,
      ra: state.ra,
      dec: state.dec,
      eclipticLon: state.eclipticLon,
      eclipticLat: state.eclipticLat,
      latitude: state.latitude,
      lst: state.lst,
      obliquity: state.obliquity,
      sunLambda,
    });

    renderSummaryTable(highlightChanges);
  };

  // =========================================================================
  // 6) TryItButton ("ลองทำดู" 3-step guided comparison walkthrough)
  // =========================================================================
  const applyDemoFrame = (animated: Record<string, number>) => {
    if (typeof animated.altitude === 'number' && typeof animated.azimuth === 'number') {
      // Step 1: define star via Horizon
      setActiveTab('horizon');
      activePresetId = null;
      renderPresetButtons();
      state = resolveCompareCoords(
        'horizon',
        {
          altitude: animated.altitude,
          azimuth: animated.azimuth,
          latitude: animated.latitude ?? state.latitude,
          lst: animated.lst ?? state.lst,
          obliquity: animated.obliquity ?? state.obliquity,
        },
        locale
      );
    } else {
      // Step 2 (LST advance) or Step 3 (Latitude change): keep RA/Dec constant!
      state = resolveCompareCoords(
        'equatorial',
        {
          ra: state.ra,
          dec: state.dec,
          latitude: animated.latitude ?? state.latitude,
          lst: animated.lst ?? state.lst,
          obliquity: animated.obliquity ?? state.obliquity,
        },
        locale
      );
    }
    syncAllUI(true);
  };

  const tryItButton = createTryItButton({
    accent: 'multi',
    description: i18n.pick(mod.demoDescription),
    steps: mod.demoSteps,
    onToggle: (shouldPlay) => {
      if (shouldPlay && mod.demoSteps) {
        skyScene.startSteppedDemo(
          mod.demoSteps,
          applyDemoFrame,
          (stepIdx) => {
            tryItButton.setActiveStep(stepIdx);
          },
          () => {
            tryItButton.setPlaying(false);
          }
        );
      } else {
        skyScene.stopDemo();
        tryItButton.setActiveStep(null);
      }
    },
    onSelectStep: (stepIndex) => {
      const step = mod.demoSteps?.[stepIndex];
      if (!step) return;
      if (step.sweep) {
        tryItButton.setPlaying(true);
        skyScene.startSteppedDemo(
          [step],
          applyDemoFrame,
          () => {
            tryItButton.setActiveStep(stepIndex);
          },
          () => {
            tryItButton.setPlaying(false);
          }
        );
      } else {
        tryItButton.setPlaying(false);
        skyScene.animateToValues(step.values, applyDemoFrame);
      }
    },
  });

  // Wire unified lock state across 3D scene, all 3 source tabs, shared params, Earth map & presets
  setCompareLocked = (locked: boolean) => {
    skyScene.setCoordsLocked(locked);
    sharedPanel.setLocked(locked);
    for (const cp of sourcePanels.values()) {
      cp.setLocked(locked);
    }
    earthMapPicker.element.classList.toggle('pointer-events-none', locked);
    earthMapPicker.element.classList.toggle('opacity-60', locked);
    presetGrid.classList.toggle('pointer-events-none', locked);
    presetGrid.classList.toggle('opacity-60', locked);
  };

  // Initial table fill without flash
  renderSummaryTable(false);

  // =========================================================================
  // Assemble Responsive 2-Column Workspace (Mobile: 3D -> Summary Table -> TryIt -> Controls)
  // =========================================================================
  const sceneCol = document.createElement('div');
  sceneCol.className = 'space-y-4 min-w-0';

  const actionCard = document.createElement('div');
  actionCard.className =
    'rounded-2xl border border-line bg-surface p-4 shadow-sm';
  actionCard.appendChild(tryItButton.element);

  sceneCol.append(skyScene.element, tableCard, actionCard);

  const sideCol = document.createElement('div');
  sideCol.className = 'space-y-4 min-w-0';

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

  sideCol.append(
    presetCard,
    sourceCard,
    earthMapPicker.element,
    sharedPanel.element,
    objectivesCard
  );

  workspace.append(sceneCol, sideCol);
  workspaceOuter.appendChild(workspace);

  return {
    element: workspaceOuter,
    dispose: () => {
      skyScene.dispose();
      sharedPanel.destroy();
      earthMapPicker.destroy();
      for (const cp of sourcePanels.values()) {
        cp.destroy();
      }
    },
  };
}
