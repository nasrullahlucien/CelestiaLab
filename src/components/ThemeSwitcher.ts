import { themeManager, type ThemeMode, type ThemeState } from '../theme/themeManager';
import { i18n } from '../i18n';
import { ICONS } from './Icons';

export interface ThemeSwitcherHandle {
  element: HTMLElement;
  destroy: () => void;
}

export function createThemeSwitcher(compact = false): ThemeSwitcherHandle {
  const container = document.createElement('div');
  container.setAttribute('role', 'group');
  container.className =
    'inline-flex items-center gap-1 rounded-xl border border-line bg-subtle p-1';

  const modes: Array<{
    mode: ThemeMode;
    icon: () => string;
  }> = [
    { mode: 'auto', icon: () => ICONS.autoSystem('w-4 h-4 shrink-0') },
    { mode: 'light', icon: () => ICONS.sun('w-4 h-4 shrink-0') },
    { mode: 'dark', icon: () => ICONS.moon('w-4 h-4 shrink-0') },
  ];

  const buttons = new Map<ThemeMode, HTMLButtonElement>();

  for (const item of modes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.themeOption = item.mode;
    btn.className =
      'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors';
    btn.addEventListener('click', () => {
      themeManager.setMode(item.mode);
    });
    buttons.set(item.mode, btn);
    container.appendChild(btn);
  }

  const renderState = (state: ThemeState) => {
    const t = i18n.t().theme;
    container.setAttribute('aria-label', t.groupLabel);

    const sysLabel =
      state.systemResolved === 'dark' ? t.currentlyDark : t.currentlyLight;

    for (const item of modes) {
      const btn = buttons.get(item.mode);
      if (!btn) continue;
      const isActive = state.mode === item.mode;
      btn.setAttribute('aria-pressed', String(isActive));

      const baseLabel =
        item.mode === 'auto'
          ? t.auto
          : item.mode === 'light'
            ? t.light
            : t.dark;

      const accessibleLabel =
        item.mode === 'auto' ? `${baseLabel} (${sysLabel})` : baseLabel;

      const autoSubIcon =
        item.mode === 'auto'
          ? `<span class="opacity-80" aria-hidden="true">${
              state.systemResolved === 'dark'
                ? ICONS.moon('w-3 h-3')
                : ICONS.sun('w-3 h-3')
            }</span>`
          : '';

      if (compact) {
        btn.setAttribute('aria-label', accessibleLabel);
        btn.innerHTML = `${item.icon()}${autoSubIcon}<span class="hidden sm:inline">${baseLabel}</span>`;
      } else {
        btn.removeAttribute('aria-label');
        const subHint =
          item.mode === 'auto'
            ? ` <span class="text-[11px] opacity-80">(${sysLabel})</span>`
            : '';
        btn.innerHTML = `${item.icon()}${autoSubIcon}<span>${baseLabel}${subHint}</span>`;
      }

      if (isActive) {
        btn.className =
          'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-surface text-ink shadow-sm ring-1 ring-line-strong transition-colors';
      } else {
        btn.className =
          'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-surface/60 transition-colors';
      }
    }
  };

  const unsubTheme = themeManager.subscribe(renderState);
  const unsubLang = i18n.subscribe(() => renderState(themeManager.getState()));

  return {
    element: container,
    destroy: () => {
      unsubTheme();
      unsubLang();
    },
  };
}
