import { create } from 'zustand';

const KEY = 'cuptune:searches';
const MAX = 12;

function save(items: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* diabaikan */
  }
}

export const useSearches = create<{
  items: string[];
  hydrate: () => void;
  add: (q: string) => void;
  remove: (q: string) => void;
  clear: () => void;
}>((set, get) => ({
  items: [],
  hydrate: () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
      if (Array.isArray(v)) set({ items: v.filter((x): x is string => typeof x === 'string').slice(0, MAX) });
    } catch {
      /* abaikan */
    }
  },
  add: (q) => {
    const t = q.trim();
    if (t.length < 2) return;
    const items = [t, ...get().items.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
    save(items);
    set({ items });
  },
  remove: (q) => {
    const items = get().items.filter((x) => x !== q);
    save(items);
    set({ items });
  },
  clear: () => {
    save([]);
    set({ items: [] });
  },
}));
