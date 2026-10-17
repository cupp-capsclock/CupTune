import { create } from 'zustand';
import type { ThumbQ } from '@/lib/tracks';

export type Theme = 'dark' | 'light';
export type Accent = 'sky' | 'violet' | 'mint' | 'rose' | 'amber';
export type Motion = 'system' | 'on' | 'off';
export type ThumbPref = 'auto' | 'low' | 'high';

interface Persisted {
  theme: Theme;
  accent: Accent;
  motion: Motion;
  thumbPref: ThumbPref;
  keepAwake: boolean;
}

const KEY = 'cuptune:settings';
const DEFAULTS: Persisted = { theme: 'dark', accent: 'sky', motion: 'system', thumbPref: 'auto', keepAwake: true };

function resolveQ(pref: ThumbPref): ThumbQ {
  if (pref !== 'auto') return pref;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || /(^|-)(2g|3g)$/.test(c?.effectiveType ?? '')) return 'low';
  return 'high';
}

function apply(s: Persisted) {
  const d = document.documentElement;
  d.dataset.theme = s.theme;
  d.dataset.accent = s.accent;
  d.dataset.motion = s.motion;
}

export const useSettings = create<Persisted & {
  thumbQ: ThumbQ;
  hydrate: () => void;
  update: (p: Partial<Persisted>) => void;
}>((set, get) => ({
  ...DEFAULTS,
  thumbQ: 'low',
  hydrate: () => {
    let saved: Partial<Persisted> = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Persisted>;
    } catch {
      /* gunakan default */
    }
    const s: Persisted = { ...DEFAULTS, ...saved };
    apply(s);
    set({ ...s, thumbQ: resolveQ(s.thumbPref) });
  },
  update: (p) => {
    const { theme, accent, motion, thumbPref, keepAwake } = { ...get(), ...p };
    const s: Persisted = { theme, accent, motion, thumbPref, keepAwake };
    apply(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* penyimpanan penuh/diblokir */
    }
    set({ ...s, thumbQ: resolveQ(s.thumbPref) });
  },
}));
