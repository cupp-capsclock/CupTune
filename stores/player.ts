import { create } from 'zustand';
import type { Track } from '@/lib/types';
import { shuffled } from '@/lib/tracks';
import { useProgress } from './progress';
import { toast } from './toast';

export type Repeat = 'off' | 'all' | 'one';
export type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type Cmd = { type: 'play' | 'pause' | 'seek' | 'volume' | 'mute'; value?: number; n: number } | null;

const MAX_QUEUE = 200;
let cmdN = 0;
const mk = (type: NonNullable<Cmd>['type'], value?: number): Cmd => ({ type, value, n: ++cmdN });
const rand = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

interface P {
  queue: Track[];
  index: number;
  status: Status; // status pemutaran nyata (bukan status pengambilan data)
  error: string | null;
  volume: number; // 0-100
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  expanded: boolean;
  queueOpen: boolean;
  loadToken: number;
  cmd: Cmd;
  played: string[];
  errStreak: number;

  playTracks: (tracks: Track[], start?: number) => void;
  playShuffled: (tracks: Track[]) => void;
  playNext: (t: Track) => void;
  addToQueue: (t: Track) => void;
  addManyToQueue: (ts: Track[]) => void;
  removeFromQueue: (i: number) => void;
  clearQueue: () => void;
  jumpTo: (i: number) => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  toggle: () => void;
  retry: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setExpanded: (v: boolean) => void;
  setQueueOpen: (v: boolean) => void;
  hydrate: (queue: Track[], index: number) => void;
  _report: (s: Status) => void;
  _trackFailed: (msg: string) => void;
  _endOfQueue: () => void;
}

export const usePlayer = create<P>((set, get) => ({
  queue: [],
  index: -1,
  status: 'idle',
  error: null,
  volume: 80,
  muted: false,
  shuffle: false,
  repeat: 'off',
  expanded: false,
  queueOpen: false,
  loadToken: 0,
  cmd: null,
  played: [],
  errStreak: 0,

  playTracks: (tracks, start = 0) => {
    if (!tracks.length) return;
    const from = Math.max(0, Math.min(start, tracks.length - MAX_QUEUE));
    const list = tracks.slice(from, from + MAX_QUEUE);
    set({ queue: list, index: Math.max(0, Math.min(start - from, list.length - 1)), status: 'loading', error: null, played: [], errStreak: 0, loadToken: get().loadToken + 1 });
  },

  playShuffled: (tracks) => {
    if (!tracks.length) return;
    set({ shuffle: true });
    get().playTracks(shuffled(tracks), 0);
  },

  playNext: (t) => {
    const { queue, index } = get();
    if (!queue.length) return get().playTracks([t]);
    const cur = queue[index];
    if (cur && cur.id === t.id) return toast('Lagu ini sedang diputar');
    const q = queue.filter((x, i) => i === index || x.id !== t.id);
    const ci = cur ? q.indexOf(cur) : -1;
    q.splice(ci + 1, 0, t);
    set({ queue: q, index: ci });
    toast('Akan diputar berikutnya');
  },

  addToQueue: (t) => {
    const { queue } = get();
    if (!queue.length) return get().playTracks([t]);
    if (queue.some((x) => x.id === t.id)) return toast('Sudah ada di antrean');
    if (queue.length >= MAX_QUEUE) return toast('Antrean penuh (maksimal 200 lagu)', 'err');
    set({ queue: [...queue, t] });
    toast('Ditambahkan ke antrean');
  },

  addManyToQueue: (ts) => {
    const { queue } = get();
    if (!queue.length) return get().playTracks(ts);
    const ids = new Set(queue.map((x) => x.id));
    const fresh = ts.filter((t) => !ids.has(t.id)).slice(0, MAX_QUEUE - queue.length);
    if (!fresh.length) return toast('Semua lagu sudah ada di antrean');
    set({ queue: [...queue, ...fresh] });
    toast(`${fresh.length} lagu ditambahkan ke antrean`);
  },

  removeFromQueue: (i) => {
    const { queue, index, status } = get();
    if (i < 0 || i >= queue.length) return;
    const q = queue.filter((_, k) => k !== i);
    if (!q.length) {
      set({ queue: [], index: -1, status: 'idle', error: null, cmd: mk('pause'), expanded: false, queueOpen: false });
      useProgress.getState().set(0, 0);
      return;
    }
    if (i < index) set({ queue: q, index: index - 1 });
    else if (i > index) set({ queue: q });
    else {
      const active = status === 'playing' || status === 'loading';
      set(active
        ? { queue: q, index: Math.min(i, q.length - 1), status: 'loading', loadToken: get().loadToken + 1 }
        : { queue: q, index: Math.min(i, q.length - 1), status: 'paused' });
    }
  },

  clearQueue: () => {
    const { queue, index } = get();
    const cur = queue[index];
    set({ queue: cur ? [cur] : [], index: cur ? 0 : -1, played: [] });
  },

  jumpTo: (i) => {
    const { queue, index, played } = get();
    if (i < 0 || i >= queue.length) return;
    set({ index: i, played: queue[index] ? [...played, queue[index].id] : played, status: 'loading', error: null, errStreak: 0, loadToken: get().loadToken + 1 });
  },

  next: (auto = false) => {
    const { queue, index, repeat, shuffle, played } = get();
    if (!queue.length) return;
    if (auto && repeat === 'one') {
      set({ cmd: mk('seek', 0) });
      set({ cmd: mk('play') });
      return;
    }
    const cur = queue[index];
    let ni: number;
    if (shuffle && queue.length > 1) {
      const seen = new Set([...played, cur?.id]);
      const cand = queue.map((_, i) => i).filter((i) => !seen.has(queue[i].id));
      if (cand.length) ni = rand(cand);
      else if (repeat === 'all' || !auto) {
        ni = rand(queue.map((_, i) => i).filter((i) => i !== index));
        set({ played: [] });
      } else return get()._endOfQueue();
    } else {
      ni = index + 1;
      if (ni >= queue.length) {
        if (repeat === 'all' || !auto) ni = 0;
        else return get()._endOfQueue();
      }
    }
    set({ index: ni, played: cur ? [...get().played, cur.id] : get().played, status: 'loading', error: null, loadToken: get().loadToken + 1 });
  },

  prev: () => {
    const { queue, index, shuffle, played, repeat } = get();
    if (!queue.length) return;
    if (useProgress.getState().position > 3) {
      set({ cmd: mk('seek', 0) });
      return;
    }
    let pi = -1;
    if (shuffle && played.length) {
      const id = played[played.length - 1];
      pi = queue.findIndex((t) => t.id === id);
      set({ played: played.slice(0, -1) });
    } else if (index > 0) pi = index - 1;
    else if (repeat === 'all') pi = queue.length - 1;
    if (pi < 0) {
      set({ cmd: mk('seek', 0) });
      return;
    }
    set({ index: pi, status: 'loading', error: null, loadToken: get().loadToken + 1 });
  },

  toggle: () => {
    const { status, queue, index } = get();
    if (!queue[index]) return;
    set({ cmd: mk(status === 'playing' || status === 'loading' ? 'pause' : 'play') });
  },

  retry: () => {
    if (get().index < 0) return;
    set({ status: 'loading', error: null, errStreak: 0, loadToken: get().loadToken + 1 });
  },

  seek: (t) => {
    useProgress.getState().set(t);
    set({ cmd: mk('seek', t) });
  },
  setVolume: (v) => set({ volume: Math.max(0, Math.min(100, v)), muted: false, cmd: mk('volume') }),
  toggleMute: () => set({ muted: !get().muted, cmd: mk('mute') }),
  toggleShuffle: () => set({ shuffle: !get().shuffle, played: [] }),
  cycleRepeat: () => set({ repeat: ({ off: 'all', all: 'one', one: 'off' } as const)[get().repeat] }),
  setExpanded: (v) => set({ expanded: v }),
  setQueueOpen: (v) => set({ queueOpen: v }),

  hydrate: (queue, index) => {
    if (get().queue.length) return;
    const i = Math.max(0, Math.min(index, queue.length - 1));
    set({ queue, index: i, status: 'paused' });
    useProgress.getState().set(0, queue[i]?.durationSec ?? 0);
  },

  _report: (status) => set(status === 'playing' ? { status, error: null, errStreak: 0 } : { status }),

  _trackFailed: (msg) => {
    const { errStreak, queue, index, repeat } = get();
    toast(msg, 'err');
    set({ status: 'error', error: msg, errStreak: errStreak + 1 });
    const hasNext = index < queue.length - 1 || repeat === 'all';
    if (hasNext && errStreak < 2) {
      const idx = index;
      setTimeout(() => {
        const s = get();
        if (s.index === idx && s.status === 'error') s.next(false);
      }, 1500);
    }
  },

  _endOfQueue: () => {
    set({ status: 'paused', cmd: mk('pause') });
    set({ cmd: mk('seek', 0) });
  },
}));
