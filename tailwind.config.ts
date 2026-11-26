import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Noto Sans Thai"',
          '"Sarabun"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      colors: {
        canvas: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        elevated: 'var(--bg-elevated)',
        ink: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        line: {
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        horizon: {
          DEFAULT: 'var(--coord-horizon)',
          soft: 'var(--coord-horizon-soft)',
          border: 'var(--coord-horizon-border)',
          contrast: 'var(--coord-horizon-on-solid)',
        },
        equatorial: {
          DEFAULT: 'var(--coord-equatorial)',
          soft: 'var(--coord-equatorial-soft)',
          border: 'var(--coord-equatorial-border)',
          contrast: 'var(--coord-equatorial-on-solid)',
        },
        ecliptic: {
          DEFAULT: 'var(--coord-ecliptic)',
          soft: 'var(--coord-ecliptic-soft)',
          border: 'var(--coord-ecliptic-border)',
          contrast: 'var(--coord-ecliptic-on-solid)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
