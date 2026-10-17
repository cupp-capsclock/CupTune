import { apiGet } from './api';
import type { Track } from './types';

export interface LyricLine {
  t: number; // detik
  text: string;
}

export interface Candidate {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  synced: string | null;
  plain: string | null;
}

export interface Lyrics {
  id: number;
  title: string;
  artist: string;
  synced: LyricLine[] | null; // null = tidak ada timestamp → jangan tampilkan sebagai sinkron
  plain: string | null;
}

/** Parse format LRC. Baris tanpa timestamp valid diabaikan; tag metadata ([ar:], [ti:], dst.) dibuang. */
export function parseLRC(raw: string): LyricLine[] {
  const out: LyricLine[] = [];
  const stamp = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  for (const row of raw.split(/\r?\n/)) {
    const times: number[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    stamp.lastIndex = 0;
    while ((m = stamp.exec(row))) {
      const frac = m[3] ? Number(m[3]) / 10 ** m[3].length : 0;
      times.push(Number(m[1]) * 60 + Number(m[2]) + frac);
      last = stamp.lastIndex;
    }
    if (!times.length) continue;
    const text = row.slice(last).replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, '').trim(); // buang tag kata (enhanced LRC)
    for (const t of times) out.push({ t, text });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Indeks baris aktif untuk posisi tertentu (-1 sebelum baris pertama). */
export function activeIndex(lines: LyricLine[], pos: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= pos) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

const NOISE = /official|video|lyric|lirik|audio|visuali[sz]er|\bmv\b|\bhd\b|\b4k\b|clip|remaster|live|karaoke/i;

export function cleanTitle(raw: string): string {
  let t = raw.replace(/[\(\[（【][^\)\]）】]*[\)\]）】]/g, (m) => (NOISE.test(m) || /feat|ft\.|with/i.test(m) ? '' : m));
  t = t.replace(/\s*[|｜•].*$/, '').replace(/\s+(official|lyrics?|lirik).*$/i, '');
  return t.replace(/\s{2,}/g, ' ').trim();
}

export function cleanArtist(raw: string): string {
  return raw.replace(/\s*-\s*topic$/i, '').replace(/vevo$/i, '').replace(/\s+official(\s+channel)?$/i, '').trim();
}

/** Tebak judul & artis untuk pencarian lirik (judul YouTube sering berformat "Artis - Judul"). */
export function guessQuery(t: Track): { title: string; artist: string } {
  let title = cleanTitle(t.title);
  let artist = t.source === 'local' && t.artist === 'Berkas lokal' ? '' : cleanArtist(t.artist);
  const m = title.match(/^(.{2,60}?)\s+[-–—]\s+(.{2,})$/);
  if (m) {
    artist = m[1].trim();
    title = m[2].trim();
  }
  return { title, artist };
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Pilih kandidat yang yakin cocok. Lebih baik tidak menampilkan lirik daripada menampilkan lirik lagu lain,
 * maka judul harus cocok dan (jika durasi diketahui) selisih durasi ≤ 5 detik.
 */
export function bestMatch(cands: Candidate[], title: string, durationSec?: number): Candidate | null {
  const want = norm(title);
  if (!want) return null;
  const ok = cands.filter((c) => {
    const ct = norm(c.title);
    const titleOk = ct === want || ct.includes(want) || want.includes(ct);
    const durOk = !durationSec || !c.duration || Math.abs(c.duration - durationSec) <= 5;
    return titleOk && durOk && (c.synced || c.plain);
  });
  if (!ok.length) return null;
  ok.sort((a, b) => Number(!!b.synced) - Number(!!a.synced) || Math.abs(a.duration - (durationSec ?? a.duration)) - Math.abs(b.duration - (durationSec ?? b.duration)));
  return ok[0];
}

export function toLyrics(c: Candidate): Lyrics {
  const synced = c.synced ? parseLRC(c.synced) : [];
  return { id: c.id, title: c.title, artist: c.artist, synced: synced.length >= 2 ? synced : null, plain: c.plain };
}

export async function searchCandidates(p: { title?: string; artist?: string; q?: string }): Promise<Candidate[]> {
  const qs = new URLSearchParams();
  if (p.q) qs.set('q', p.q);
  if (p.title) qs.set('title', p.title);
  if (p.artist) qs.set('artist', p.artist);
  const r = await apiGet<{ candidates: Candidate[] }>(`/api/lyrics?${qs}`, 30 * 60_000);
  return r.candidates;
}

// ---- cache pilihan lirik per lagu (localStorage, dibatasi 40 entri) ----
const KEY = 'cuptune:lyrics:v1';

function readAll(): Record<string, { at: number; c: Candidate }> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, { at: number; c: Candidate }>;
  } catch {
    return {};
  }
}

export function loadSaved(trackId: string): Candidate | null {
  return readAll()[trackId]?.c ?? null;
}

export function saveChoice(trackId: string, c: Candidate) {
  try {
    const all = readAll();
    all[trackId] = { at: Date.now(), c };
    const keys = Object.keys(all).sort((a, b) => all[b].at - all[a].at);
    for (const k of keys.slice(40)) delete all[k];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* penyimpanan penuh/diblokir */
  }
}

export function clearChoice(trackId: string) {
  try {
    const all = readAll();
    delete all[trackId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* diabaikan */
  }
}
