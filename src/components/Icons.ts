export function createSvgIcon(pathMarkup: string, className = 'w-5 h-5'): string {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">${pathMarkup}</svg>`;
}

export const ICONS = {
  logo: `<svg aria-hidden="true" viewBox="0 0 36 36" fill="none" class="w-8 h-8 shrink-0">
    <rect width="36" height="36" rx="10" fill="var(--bg-subtle)" stroke="var(--border-default)" stroke-width="1.2"/>
    <circle cx="18" cy="18" r="12" stroke="var(--coord-equatorial)" stroke-width="1.8"/>
    <ellipse cx="18" cy="18" rx="12" ry="4.5" stroke="var(--coord-horizon)" stroke-width="1.8"/>
    <ellipse cx="18" cy="18" rx="12" ry="4.5" transform="rotate(-23.5 18 18)" stroke="var(--coord-ecliptic)" stroke-width="1.8"/>
    <circle cx="18" cy="18" r="2.2" fill="var(--text-primary)"/>
  </svg>`,

  sun: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>`,
      cls
    ),

  moon: (cls = 'w-4 h-4') =>
    createSvgIcon(`<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`, cls),

  autoSystem: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>`,
      cls
    ),

  horizon: (cls = 'w-5 h-5') =>
    createSvgIcon(
      `<path d="M3 16h18"/><path d="M5 16a7 7 0 0 1 14 0"/><path d="M12 9V4"/><circle cx="12" cy="4" r="1.2" fill="currentColor"/>`,
      cls
    ),

  equatorial: (cls = 'w-5 h-5') =>
    createSvgIcon(
      `<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3" transform="rotate(-20 12 12)"/><path d="M9.5 3.5l5 17"/>`,
      cls
    ),

  ecliptic: (cls = 'w-5 h-5') =>
    createSvgIcon(
      `<circle cx="12" cy="12" r="3" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-23.5 12 12)"/><circle cx="19.5" cy="9" r="1.6" fill="currentColor"/>`,
      cls
    ),

  compare: (cls = 'w-5 h-5') =>
    createSvgIcon(
      `<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="3.2"/><ellipse cx="12" cy="12" rx="9" ry="3.2" transform="rotate(-28 12 12)"/>`,
      cls
    ),

  play: (cls = 'w-5 h-5') =>
    createSvgIcon(`<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>`, cls),

  stop: (cls = 'w-5 h-5') =>
    createSvgIcon(`<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>`, cls),

  reset: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>`,
      cls
    ),

  check: (cls = 'w-5 h-5') =>
    createSvgIcon(`<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>`, cls),

  cross: (cls = 'w-5 h-5') =>
    createSvgIcon(`<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>`, cls),

  arrowRight: (cls = 'w-4 h-4') =>
    createSvgIcon(`<path d="M5 12h14M13 5l7 7-7 7"/>`, cls),

  arrowLeft: (cls = 'w-4 h-4') =>
    createSvgIcon(`<path d="M19 12H5M11 19l-7-7 7-7"/>`, cls),

  menu: (cls = 'w-5 h-5') =>
    createSvgIcon(`<path d="M4 7h16M4 12h16M4 17h16"/>`, cls),

  close: (cls = 'w-5 h-5') =>
    createSvgIcon(`<path d="M18 6 6 18M6 6l12 12"/>`, cls),

  camera: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>`,
      cls
    ),

  globe: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>`,
      cls
    ),

  lock: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`,
      cls
    ),

  unlock: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.4-2"/>`,
      cls
    ),

  maximize: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>`,
      cls
    ),

  minimize: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>`,
      cls
    ),

  capture: (cls = 'w-4 h-4') =>
    createSvgIcon(
      `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
      cls
    ),
};
