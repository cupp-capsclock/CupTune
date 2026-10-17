import type { Config } from 'tailwindcss';

const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface2'),
        line: v('line'),
        fg: v('fg'),
        muted: v('muted'),
        accent: v('accent'),
        'accent-fg': v('accent-fg'),
        'tone-bg': v('tone-bg'),
        'tone-card': v('tone-card'),
        'tone-on': v('tone-on'),
        'tone-mute': v('tone-mute'),
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      keyframes: {
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        sheet: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        eq: { '0%,100%': { transform: 'scaleY(.3)' }, '50%': { transform: 'scaleY(1)' } },
        glow: {
          '0%,100%': { boxShadow: '0 0 50px -8px rgb(var(--cover) / 0.35)' },
          '50%': { boxShadow: '0 0 80px -6px rgb(var(--cover) / 0.65)' },
        },
        rise: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        fade: 'fade .18s ease-out',
        sheet: 'sheet .22s ease-out',
        eq: 'eq .9s ease-in-out infinite',
        glow: 'glow 3.2s ease-in-out infinite',
        rise: 'rise .35s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
