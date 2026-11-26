import type { CoordAccent, DemoStepSpec } from '../data/modules';
import { i18n } from '../i18n';
import { ICONS } from './Icons';

export interface TryItButtonOptions {
  accent: CoordAccent | 'multi';
  description?: string;
  steps?: DemoStepSpec[];
  onToggle: (shouldPlay: boolean) => void;
  onSelectStep?: (stepIndex: number) => void;
}

export interface TryItButtonHandle {
  element: HTMLElement;
  setPlaying: (playing: boolean) => void;
  setActiveStep: (stepIndex: number | null) => void;
  isPlaying: () => boolean;
}

function getButtonThemeClasses(accent: CoordAccent | 'multi', playing: boolean): string {
  if (playing) {
    return 'bg-subtle text-ink border-line-strong hover:bg-elevated';
  }
  switch (accent) {
    case 'horizon':
      return 'bg-horizon text-horizon-contrast border-horizon hover:opacity-95';
    case 'equatorial':
      return 'bg-equatorial text-equatorial-contrast border-equatorial hover:opacity-95';
    case 'ecliptic':
      return 'bg-ecliptic text-ecliptic-contrast border-ecliptic hover:opacity-95';
    case 'multi':
    default:
      return 'bg-equatorial text-equatorial-contrast border-equatorial hover:opacity-95';
  }
}

function getStepBannerClasses(accent: CoordAccent | 'multi'): string {
  switch (accent) {
    case 'horizon':
      return 'border-horizon-border bg-horizon-soft text-ink';
    case 'equatorial':
      return 'border-equatorial-border bg-equatorial-soft text-ink';
    case 'ecliptic':
      return 'border-ecliptic-border bg-ecliptic-soft text-ink';
    default:
      return 'border-line-strong bg-subtle text-ink';
  }
}

function getStepBadgeClasses(accent: CoordAccent | 'multi'): string {
  switch (accent) {
    case 'horizon':
      return 'bg-horizon text-horizon-contrast';
    case 'equatorial':
      return 'bg-equatorial text-equatorial-contrast';
    case 'ecliptic':
      return 'bg-ecliptic text-ecliptic-contrast';
    default:
      return 'bg-equatorial text-equatorial-contrast';
  }
}

export function createTryItButton(options: TryItButtonOptions): TryItButtonHandle {
  let playing = false;
  let activeStepIndex: number | null = null;

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col gap-3';

  const topRow = document.createElement('div');
  topRow.className = 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between';

  const button = document.createElement('button');
  button.type = 'button';

  const statusText = document.createElement('p');
  statusText.className = 'text-xs text-ink-muted leading-relaxed flex-1';

  topRow.append(button, statusText);
  wrapper.appendChild(topRow);

  // Optional step pills + live step explanation card
  let stepPillsRow: HTMLDivElement | null = null;
  let stepBanner: HTMLDivElement | null = null;
  const stepButtons: HTMLButtonElement[] = [];

  if (options.steps && options.steps.length > 0) {
    stepPillsRow = document.createElement('div');
    stepPillsRow.className = 'flex flex-wrap items-center gap-1.5';

    options.steps.forEach((step, idx) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className =
        'inline-flex items-center gap-1.5 rounded-xl border border-line bg-subtle px-3 py-1.5 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
      pill.textContent = i18n.pick(step.title);
      pill.addEventListener('click', () => {
        activeStepIndex = idx;
        renderStepUI();
        options.onSelectStep?.(idx);
      });
      stepButtons.push(pill);
      stepPillsRow!.appendChild(pill);
    });

    stepBanner = document.createElement('div');
    stepBanner.setAttribute('aria-live', 'polite');
    stepBanner.hidden = true;

    wrapper.append(stepPillsRow, stepBanner);
  }

  const renderStepUI = () => {
    if (!options.steps || !stepBanner) return;
    const t = i18n.t().tryIt;

    stepButtons.forEach((btn, idx) => {
      const isCurrent = activeStepIndex === idx;
      btn.setAttribute('aria-pressed', String(isCurrent));
      if (isCurrent) {
        btn.className = `inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${getStepBannerClasses(
          options.accent
        )}`;
      } else {
        btn.className =
          'inline-flex items-center gap-1.5 rounded-xl border border-line bg-subtle px-3 py-1.5 text-xs font-medium text-ink-secondary hover:border-line-strong hover:text-ink transition-colors';
      }
    });

    if (activeStepIndex === null || !options.steps[activeStepIndex]) {
      stepBanner.hidden = true;
      stepBanner.className = 'hidden';
      stepBanner.innerHTML = '';
      return;
    }

    const step = options.steps[activeStepIndex];
    stepBanner.hidden = false;
    stepBanner.className = `rounded-xl border p-3.5 space-y-1.5 ${getStepBannerClasses(
      options.accent
    )}`;
    stepBanner.innerHTML = `
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${getStepBadgeClasses(
          options.accent
        )}">
          ${i18n.format(t.stepBadge, {
            current: activeStepIndex + 1,
            total: options.steps.length,
          })}
        </span>
        <strong class="text-sm font-bold text-ink">${i18n.pick(step.title)}</strong>
      </div>
      <p class="text-xs sm:text-sm text-ink-secondary leading-relaxed">
        ${i18n.pick(step.description)}
      </p>
    `;
  };

  const render = () => {
    const t = i18n.t().tryIt;
    button.setAttribute('aria-pressed', String(playing));
    button.className = `inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.99] ${getButtonThemeClasses(
      options.accent,
      playing
    )}`;

    button.innerHTML = playing
      ? `${ICONS.stop('w-4 h-4 shrink-0')}<span>${t.stop}</span>`
      : `${ICONS.play('w-4 h-4 shrink-0')}<span>${t.play}</span>`;

    statusText.textContent = playing
      ? t.playingStatus
      : options.description ?? t.readyStatus;

    renderStepUI();
  };

  button.addEventListener('click', () => {
    playing = !playing;
    if (!playing) {
      activeStepIndex = null;
    }
    render();
    options.onToggle(playing);
  });

  render();

  return {
    element: wrapper,
    setPlaying: (next: boolean) => {
      if (playing === next) return;
      playing = next;
      render();
    },
    setActiveStep: (stepIndex: number | null) => {
      activeStepIndex = stepIndex;
      renderStepUI();
    },
    isPlaying: () => playing,
  };
}
