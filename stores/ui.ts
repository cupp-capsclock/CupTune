import { create } from 'zustand';
import type { Track } from '@/lib/types';

export interface MenuAction {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

export const useUI = create<{
  menu: { track: Track; extra: MenuAction[] } | null;
  addTo: Track | null;
  openMenu: (track: Track, extra?: MenuAction[]) => void;
  closeMenu: () => void;
  openAddTo: (track: Track) => void;
  closeAddTo: () => void;
}>((set) => ({
  menu: null,
  addTo: null,
  openMenu: (track, extra = []) => set({ menu: { track, extra } }),
  closeMenu: () => set({ menu: null }),
  openAddTo: (track) => set({ addTo: track, menu: null }),
  closeAddTo: () => set({ addTo: null }),
}));
