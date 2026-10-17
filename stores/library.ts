import { create } from 'zustand';
import { blobDel, kvGet, kvSet } from '@/lib/db';
import { uid } from '@/lib/format';
import type { Playlist, Track } from '@/lib/types';
import { toast } from './toast';

type Key = 'saved' | 'favorites' | 'playlists' | 'recents';
const KEYS: Key[] = ['saved', 'favorites', 'playlists', 'recents'];
const MAX_RECENTS = 100;

interface Lib {
  loaded: boolean;
  storageOk: boolean;
  saved: Track[];
  favorites: Track[];
  playlists: Playlist[];
  recents: Track[]; // addedAt = waktu diputar
  load: () => Promise<void>;
  toggleFavorite: (t: Track) => void;
  toggleSaved: (t: Track) => void;
  addSaved: (ts: Track[]) => void;
  addRecent: (t: Track) => void;
  clearRecents: () => void;
  createPlaylist: (name: string, tracks?: Track[]) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, t: Track) => boolean;
  removeFromPlaylist: (id: string, trackId: string) => void;
  deleteLocal: (id: string) => Promise<void>;
}

const stamp = (t: Track): Track => ({ ...t, addedAt: Date.now() });
const valid = (t: unknown): t is Track =>
  typeof t === 'object' && t !== null && typeof (t as Track).id === 'string' && typeof (t as Track).title === 'string' && ['youtube', 'local'].includes((t as Track).source);

let subscribed = false;
const timers: Partial<Record<Key, ReturnType<typeof setTimeout>>> = {};
let warned = false;

export const useLibrary = create<Lib>((set, get) => ({
  loaded: false,
  storageOk: true,
  saved: [],
  favorites: [],
  playlists: [],
  recents: [],

  load: async () => {
    if (get().loaded) return;
    try {
      const [saved, favorites, playlists, recents] = await Promise.all(KEYS.map((k) => kvGet<unknown>(k)));
      set({
        saved: Array.isArray(saved) ? saved.filter(valid) : [],
        favorites: Array.isArray(favorites) ? favorites.filter(valid) : [],
        playlists: Array.isArray(playlists)
          ? (playlists as Playlist[]).filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.tracks)).map((p) => ({ ...p, tracks: p.tracks.filter(valid) }))
          : [],
        recents: Array.isArray(recents) ? recents.filter(valid) : [],
        loaded: true,
        storageOk: true,
      });
    } catch {
      set({ loaded: true, storageOk: false });
      toast('Penyimpanan lokal tidak tersedia. Pustaka tidak akan tersimpan setelah halaman ditutup.', 'err');
    }
    if (!subscribed) {
      subscribed = true;
      useLibrary.subscribe((s, prev) => {
        for (const k of KEYS) {
          if (s[k] === prev[k] || !s.loaded) continue;
          clearTimeout(timers[k]);
          timers[k] = setTimeout(() => {
            kvSet(k, useLibrary.getState()[k]).catch(() => {
              if (!warned) {
                warned = true;
                toast('Gagal menyimpan ke penyimpanan lokal.', 'err');
              }
            });
          }, 250);
        }
      });
    }
  },

  toggleFavorite: (t) => {
    const has = get().favorites.some((x) => x.id === t.id);
    set({ favorites: has ? get().favorites.filter((x) => x.id !== t.id) : [stamp(t), ...get().favorites] });
    toast(has ? 'Dihapus dari favorit' : 'Ditambahkan ke favorit');
  },
  toggleSaved: (t) => {
    const has = get().saved.some((x) => x.id === t.id);
    set({ saved: has ? get().saved.filter((x) => x.id !== t.id) : [stamp(t), ...get().saved] });
    toast(has ? 'Dihapus dari pustaka' : 'Disimpan ke pustaka');
  },
  addSaved: (ts) => {
    const ids = new Set(get().saved.map((x) => x.id));
    const fresh = ts.filter((t) => !ids.has(t.id)).map(stamp);
    if (fresh.length) set({ saved: [...fresh, ...get().saved] });
  },
  addRecent: (t) => set({ recents: [stamp(t), ...get().recents.filter((x) => x.id !== t.id)].slice(0, MAX_RECENTS) }),
  clearRecents: () => set({ recents: [] }),

  createPlaylist: (name, tracks = []) => {
    const now = Date.now();
    const id = uid();
    set({ playlists: [{ id, name: name.trim().slice(0, 60) || 'Playlist baru', createdAt: now, updatedAt: now, tracks: tracks.map(stamp) }, ...get().playlists] });
    return id;
  },
  renamePlaylist: (id, name) =>
    set({ playlists: get().playlists.map((p) => (p.id === id ? { ...p, name: name.trim().slice(0, 60) || p.name, updatedAt: Date.now() } : p)) }),
  deletePlaylist: (id) => set({ playlists: get().playlists.filter((p) => p.id !== id) }),
  addToPlaylist: (id, t) => {
    const p = get().playlists.find((x) => x.id === id);
    if (!p || p.tracks.some((x) => x.id === t.id)) return false;
    set({ playlists: get().playlists.map((x) => (x.id === id ? { ...x, tracks: [...x.tracks, stamp(t)], updatedAt: Date.now() } : x)) });
    return true;
  },
  removeFromPlaylist: (id, trackId) =>
    set({ playlists: get().playlists.map((p) => (p.id === id ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId), updatedAt: Date.now() } : p)) }),

  deleteLocal: async (id) => {
    try {
      await blobDel(id);
    } catch {
      /* tetap hapus metadata */
    }
    const g = get();
    set({
      saved: g.saved.filter((t) => t.id !== id),
      favorites: g.favorites.filter((t) => t.id !== id),
      recents: g.recents.filter((t) => t.id !== id),
      playlists: g.playlists.map((p) => ({ ...p, tracks: p.tracks.filter((t) => t.id !== id) })),
    });
  },
}));
