import { create } from 'zustand';

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}
interface PromptState {
  title: string;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  resolve: (v: string | null) => void;
}

export const useDialogs = create<{
  confirmState: ConfirmState | null;
  promptState: PromptState | null;
  confirm: (o: Omit<ConfirmState, 'resolve'>) => Promise<boolean>;
  ask: (o: Omit<PromptState, 'resolve'>) => Promise<string | null>;
  closeConfirm: (v: boolean) => void;
  closePrompt: (v: string | null) => void;
}>((set, get) => ({
  confirmState: null,
  promptState: null,
  confirm: (o) => new Promise((resolve) => set({ confirmState: { ...o, resolve } })),
  ask: (o) => new Promise((resolve) => set({ promptState: { ...o, resolve } })),
  closeConfirm: (v) => {
    get().confirmState?.resolve(v);
    set({ confirmState: null });
  },
  closePrompt: (v) => {
    get().promptState?.resolve(v);
    set({ promptState: null });
  },
}));

export const confirmDialog = (o: Omit<ConfirmState, 'resolve'>) => useDialogs.getState().confirm(o);
export const askText = (o: Omit<PromptState, 'resolve'>) => useDialogs.getState().ask(o);
