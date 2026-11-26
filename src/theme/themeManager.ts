export type ThemeMode = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface SceneThemePalette {
  background: number;
  fog: number;
  sphereWireframe: number;
  sphereWireframeOpacity: number;
  sphereShell: number;
  sphereShellOpacity: number;
  groundFill: number;
  groundOpacity: number;
  starColor: number;
  starOpacity: number;
  observerColor: number;
  axisMuted: number;
  horizon: number;
  equatorial: number;
  ecliptic: number;
  targetStar: number;
  sunColor: number;
  ambientLight: number;
  ambientIntensity: number;
}

export interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  systemResolved: ResolvedTheme;
}

const STORAGE_KEY = 'celestialab-theme';

type ThemeListener = (state: ThemeState) => void;

class ThemeManager {
  private mode: ThemeMode = 'auto';
  private systemResolved: ResolvedTheme = 'dark';
  private listeners = new Set<ThemeListener>();
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    this.mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    this.systemResolved = this.mediaQuery?.matches ? 'dark' : 'light';
    this.mode = this.readStoredMode();
    this.applyToDom();

    // Keep system preference reactive without deleting explicit user overrides
    this.mediaQuery?.addEventListener('change', (event) => {
      this.systemResolved = event.matches ? 'dark' : 'light';
      this.applyToDom();
      this.emit();
    });

    // Keep multiple tabs synchronized via storage event
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
          this.mode = this.parseStored(event.newValue);
          this.applyToDom();
          this.emit();
        }
      });
    }
  }

  private parseStored(value: string | null): ThemeMode {
    if (value === 'light' || value === 'dark') {
      return value;
    }
    return 'auto';
  }

  private readStoredMode(): ThemeMode {
    try {
      return this.parseStored(localStorage.getItem(STORAGE_KEY));
    } catch {
      return 'auto';
    }
  }

  public getState(): ThemeState {
    const resolved: ResolvedTheme =
      this.mode === 'auto' ? this.systemResolved : this.mode;
    return {
      mode: this.mode,
      resolved,
      systemResolved: this.systemResolved,
    };
  }

  public setMode(nextMode: ThemeMode): void {
    this.mode = nextMode;
    try {
      if (nextMode === 'auto') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, nextMode);
      }
    } catch {
      // Still apply theme even when storage is restricted
    }
    this.applyToDom();
    this.emit();
  }

  public subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private applyToDom(): void {
    if (typeof document === 'undefined') return;
    const { mode, resolved } = this.getState();

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="color-scheme"]'
    );
    if (meta) {
      meta.content = mode === 'auto' ? 'light dark' : mode;
    }

    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.dataset.themeMode = mode;
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  public getScenePalette(resolved = this.getState().resolved): SceneThemePalette {
    if (resolved === 'dark') {
      return {
        background: 0x060b16,
        fog: 0x060b16,
        sphereWireframe: 0x475569,
        sphereWireframeOpacity: 0.34,
        sphereShell: 0x1e293b,
        sphereShellOpacity: 0.14,
        groundFill: 0x0f2a24,
        groundOpacity: 0.42,
        starColor: 0xe2e8f0,
        starOpacity: 0.85,
        observerColor: 0xf8fafc,
        axisMuted: 0x64748b,
        horizon: 0x34d399, // เขียวสว่างบนพื้นมืด
        equatorial: 0x38bdf8, // ฟ้าสว่างบนพื้นมืด
        ecliptic: 0xfacc15, // เหลืองสว่างบนพื้นมืด
        targetStar: 0xf8fafc,
        sunColor: 0xfde047,
        ambientLight: 0xffffff,
        ambientIntensity: 0.9,
      };
    }

    return {
      background: 0xeaf2fb,
      fog: 0xeaf2fb,
      sphereWireframe: 0x64748b,
      sphereWireframeOpacity: 0.32,
      sphereShell: 0xcbd5e1,
      sphereShellOpacity: 0.14,
      groundFill: 0xa7f3d0,
      groundOpacity: 0.42,
      starColor: 0x334155,
      starOpacity: 0.55,
      observerColor: 0x0f172a,
      axisMuted: 0x64748b,
      horizon: 0x047857, // เขียวเข้มผ่าน contrast บนพื้นสว่าง
      equatorial: 0x0369a1, // ฟ้าเข้มผ่าน contrast บนพื้นสว่าง
      ecliptic: 0x92400e, // เหลืองอำพันเข้มผ่าน contrast บนพื้นสว่าง
      targetStar: 0x0f172a,
      sunColor: 0xb45309,
      ambientLight: 0xffffff,
      ambientIntensity: 1.0,
    };
  }
}

export const themeManager = new ThemeManager();
