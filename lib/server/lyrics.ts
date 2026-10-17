import { ApiError } from './youtube';

// Sumber lirik: LRCLIB (https://lrclib.net) — database lirik komunitas terbuka dengan API publik tanpa kunci.
const BASE = 'https://lrclib.net/api';

export interface Candidate {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  synced: string | null;
  plain: string | null;
}

interface Raw {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const MAX_LEN = 30_000;

async function call(path: string): Promise<Raw[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${BASE}${path}`, { signal: ctrl.signal, cache: 'no-store', headers: { 'User-Agent': 'CupTune/1.0 (by MkdirCup)' } });
    if (r.status === 404) return [];
    if (!r.ok) throw new ApiError('UPSTREAM', 502, 'Layanan lirik sedang bermasalah. Coba lagi nanti.');
    const j: unknown = await r.json();
    return Array.isArray(j) ? (j as Raw[]) : [];
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('TIMEOUT', 504, 'Layanan lirik tidak dapat dihubungi.');
  } finally {
    clearTimeout(timer);
  }
}

function toCandidates(rows: Raw[]): Candidate[] {
  const out: Candidate[] = [];
  for (const r of rows) {
    if (r.instrumental || typeof r.id !== 'number' || !r.trackName) continue;
    const synced = typeof r.syncedLyrics === 'string' && r.syncedLyrics.trim() ? r.syncedLyrics.slice(0, MAX_LEN) : null;
    const plain = typeof r.plainLyrics === 'string' && r.plainLyrics.trim() ? r.plainLyrics.slice(0, MAX_LEN) : null;
    if (!synced && !plain) continue;
    out.push({ id: r.id, title: r.trackName, artist: r.artistName ?? '', album: r.albumName ?? '', duration: Math.round(r.duration ?? 0), synced, plain });
    if (out.length >= 10) break;
  }
  return out;
}

export async function findLyrics(p: { title?: string; artist?: string; q?: string }): Promise<{ candidates: Candidate[] }> {
  const enc = encodeURIComponent;
  let rows: Raw[] = [];
  if (p.q) rows = await call(`/search?q=${enc(p.q)}`);
  else if (p.title) {
    if (p.artist) rows = await call(`/search?track_name=${enc(p.title)}&artist_name=${enc(p.artist)}`);
    if (!rows.length) rows = await call(`/search?q=${enc(`${p.title} ${p.artist ?? ''}`.trim())}`);
  }
  return { candidates: toCandidates(rows) };
}
