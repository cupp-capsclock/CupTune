import { create } from 'zustand';

// Dipisah dari state player agar perubahan progres tidak me-render ulang seluruh UI.
export const useProgress = create<{
  position: number;
  duration: number;
  set: (position: number, duration?: number) => void;
}>((set, get) => ({
  position: 0,
  duration: 0,
  set: (position, duration) => {
    const d = duration ?? get().duration;
    if (Math.abs(position - get().position) < 0.2 && d === get().duration) return;
    set({ position, duration: d });
  },
}));
