import { kvGet, kvSet } from '@/lib/db';
import type { Track } from '@/lib/types';
import { usePlayer } from '@/stores/player';
import type { Repeat } from '@/stores/player';

const PREF = 'cuptune:player';
let started = false;

const validTrack = (t: unknown): t is Track =>
  typeof t === 'object' && t !== null && typeof (t as Track).id === 'string' && typeof (t as Track).title === 'string' && ['youtube', 'local'].includes((t as Track).source);

export async function hydratePlayer() {
  if (started) return;
  started = true;
  try {
    const raw = localStorage.getItem(PREF);
    if (raw) {
      const p = JSON.parse(raw) as { volume?: number; muted?: boolean; shuffle?: boolean; repeat?: string };
      usePlayer.setState({
        volume: typeof p.volume === 'number' ? Math.max(0, Math.min(100, p.volume)) : 80,
        muted: !!p.muted,
        shuffle: !!p.shuffle,
        repeat: (['off', 'all', 'one'].includes(p.repeat ?? '') ? p.repeat : 'off') as Repeat,
      });
    }
  } catch {
    /* gunakan default */
  }
  try {
    const q = await kvGet<{ queue: unknown[]; index: number }>('queue');
    if (q && Array.isArray(q.queue)) {
      const list = q.queue.filter(validTrack);
      if (list.length) usePlayer.getState().hydrate(list, typeof q.index === 'number' ? q.index : 0);
    }
  } catch {
    /* penyimpanan tidak tersedia */
  }

  let t: ReturnType<typeof setTimeout> | undefined;
  usePlayer.subscribe((s, prev) => {
    if (s.volume !== prev.volume || s.muted !== prev.muted || s.shuffle !== prev.shuffle || s.repeat !== prev.repeat) {
      try {
        localStorage.setItem(PREF, JSON.stringify({ volume: s.volume, muted: s.muted, shuffle: s.shuffle, repeat: s.repeat }));
      } catch {
        /* diabaikan */
      }
    }
    if (s.queue !== prev.queue || s.index !== prev.index) {
      clearTimeout(t);
      t = setTimeout(() => {
        const cur = usePlayer.getState();
        kvSet('queue', { queue: cur.queue, index: cur.index }).catch(() => undefined);
      }, 400);
    }
  });
}
