import { create } from 'zustand';
import { EQ_MAX, EQ_MIN, EQ_PRESETS } from '@/lib/eq';

const KEY = 'cuptune:eq:v1';
const FLAT = EQ_PRESETS.Flat;

interface EqState {
  enabled: boolean;
  preset: string; // nama preset atau 'Kustom'
  gains: number[];
  hydrate: () => void;
  setEnabled: (v: boolean) => void;
  setBand: (i: number, v: number) => void;
  setPreset: (name: string) => void;
}

function save(s: Pick<EqState, 'enabled' | 'preset' | 'gains'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ enabled: s.enabled, preset: s.preset, gains: s.gains }));
  } catch {
    /* penyimpanan penuh/diblokir */
  }
}

export const useEq = create<EqState>((set, get) => ({
  enabled: false,
  preset: 'Flat',
  gains: FLAT,
  hydrate: () => {
    try {
      const j = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<EqState> | null;
      if (!j || !Array.isArray(j.gains) || j.gains.length !== FLAT.length) return;
      set({
        enabled: !!j.enabled,
        preset: typeof j.preset === 'string' ? j.preset : 'Kustom',
        gains: j.gains.map((g) => Math.max(EQ_MIN, Math.min(EQ_MAX, Number(g) || 0))),
      });
    } catch {
      /* data rusak → pakai default */
    }
  },
  setEnabled: (enabled) => {
    set({ enabled });
    save(get());
  },
  setBand: (i, v) => {
    const gains = [...get().gains];
    gains[i] = Math.max(EQ_MIN, Math.min(EQ_MAX, Math.round(v)));
    const match = Object.entries(EQ_PRESETS).find(([, g]) => g.every((x, k) => x === gains[k]));
    set({ gains, preset: match ? match[0] : 'Kustom' });
    save(get());
  },
  setPreset: (name) => {
    const g = EQ_PRESETS[name];
    if (!g) return;
    set({ preset: name, gains: [...g], enabled: name === 'Flat' ? get().enabled : true });
    save(get());
  },
}));
