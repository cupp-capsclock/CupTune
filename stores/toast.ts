import { create } from 'zustand';

export interface Toast {
  id: number;
  msg: string;
  kind: 'ok' | 'err';
}

let n = 0;

export const useToast = create<{
  toasts: Toast[];
  push: (msg: string, kind?: Toast['kind']) => void;
  dismiss: (id: number) => void;
}>((set, get) => ({
  toasts: [],
  push: (msg, kind = 'ok') => {
    const id = ++n;
    set({ toasts: [...get().toasts.slice(-2), { id, msg, kind }] });
    setTimeout(() => get().dismiss(id), kind === 'err' ? 5000 : 3000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (msg: string, kind: Toast['kind'] = 'ok') => useToast.getState().push(msg, kind);
