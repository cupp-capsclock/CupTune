import { create } from 'zustand';

// Tempat iframe YouTube ditampilkan: slot mini-player atau slot player penuh.
export const useSlot = create<{
  mini: HTMLElement | null;
  full: HTMLElement | null;
  set: (k: 'mini' | 'full', el: HTMLElement | null) => void;
}>((set) => ({
  mini: null,
  full: null,
  set: (k, el) => set({ [k]: el } as { mini: HTMLElement | null } | { full: HTMLElement | null }),
}));
