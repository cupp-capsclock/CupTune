import type { ErrorCode, PlaylistResponse, SearchItem, SearchResponse } from '@/lib/types';

const BASE = 'https://www.googleapis.com/youtube/v3';
const TIMEOUT_MS = 8000;
const MIN = 60_000;

export class ApiError extends Error {
  constructor(public code: ErrorCode, public status: number, message: string) {
    super(message);
  }
}

type Json = Record<string, unknown>;
type Params = Record<string, string | number | undefined>;

const isRec = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const BAD = () => new ApiError('BAD_RESPONSE', 502, 'Respons dari YouTube tidak valid.');

function keys(): string[] {
  return (process.env.YOUTUBE_API_KEY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}
export const isConfigured = () => keys().length > 0;

// ---- cache sederhana in-memory (per instance server) ----
const cache = new Map<string, { exp: number; data: unknown }>();
const MAX_CACHE = 300;
let cursor = 0;

function mapError(status: number, body: unknown): ApiError {
  const err = isRec(body) && isRec(body.error) ? body.error : {};
  const first = arr(err.errors)[0];
  const reason = isRec(first) ? str(first.reason) : '';
  const msg = str(err.message);
  if (['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded', 'userRateLimitExceeded'].includes(reason)) {
    return new ApiError('QUOTA', 429, 'Kuota API YouTube sedang habis. Coba lagi nanti.');
  }
  if (['keyInvalid', 'keyExpired', 'accessNotConfigured', 'ipRefererBlocked', 'forbidden'].includes(reason) || /API key/i.test(msg)) {
    return new ApiError('INVALID_KEY', 502, 'API key YouTube tidak valid atau tidak diizinkan. Periksa konfigurasi server.');
  }
  if (status === 404 || ['notFound', 'playlistNotFound', 'videoNotFound', 'videoChartNotFound', 'channelNotFound'].includes(reason)) {
    return new ApiError('NOT_FOUND', 404, 'Konten tidak ditemukan atau tidak tersedia.');
  }
  if (status === 400) return new ApiError('BAD_REQUEST', 400, 'Permintaan tidak valid.');
  return new ApiError('UPSTREAM', 502, 'Layanan YouTube sedang bermasalah. Coba lagi.');
}

async function request(path: string, qs: URLSearchParams, key: string): Promise<Json> {
  // URL berisi key: jangan pernah dicatat atau dimasukkan ke pesan error.
  const url = `${BASE}/${path}?${qs.toString()}&key=${encodeURIComponent(key)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ApiError('TIMEOUT', 504, 'YouTube terlalu lama merespons. Coba lagi.');
    throw new ApiError('UPSTREAM', 502, 'Tidak dapat menghubungi YouTube.');
  } finally {
    clearTimeout(timer);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw BAD();
  }
  if (!res.ok) throw mapError(res.status, body);
  if (!isRec(body)) throw BAD();
  return body;
}

async function ytFetch(path: string, params: Params, ttlMs: number): Promise<Json> {
  const ks = keys();
  if (!ks.length) throw new ApiError('NO_KEY', 503, 'API key YouTube belum dikonfigurasi di server.');
  const qs = new URLSearchParams();
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const ck = `${path}?${qs.toString()}`;
  const hit = cache.get(ck);
  if (hit && hit.exp > Date.now()) return hit.data as Json;

  let last: ApiError | null = null;
  for (let i = 0; i < ks.length; i++) {
    const idx = (cursor + i) % ks.length;
    try {
      const data = await request(path, qs, ks[idx]);
      cursor = idx;
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
      cache.set(ck, { exp: Date.now() + ttlMs, data });
      return data;
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'QUOTA' || e.code === 'INVALID_KEY')) {
        last = e;
        continue;
      }
      throw e;
    }
  }
  throw last ?? new ApiError('UPSTREAM', 502, 'Layanan YouTube sedang bermasalah.');
}

// ---- util ----
const ENT: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => ENT[m] ?? m);
const cleanArtist = (s: string) => s.replace(/\s*-\s*Topic$/i, '').trim();

function parseDuration(iso: string): number | undefined {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return undefined;
  const total = Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
  return total > 0 ? total : undefined;
}

function pickThumb(sn: Json): string {
  const t = isRec(sn.thumbnails) ? sn.thumbnails : {};
  for (const k of ['medium', 'high', 'default']) {
    const o = t[k];
    if (isRec(o) && str(o.url)) return str(o.url);
  }
  return '';
}

function videoToItem(raw: unknown): SearchItem | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id);
  const sn = raw.snippet;
  if (!id || !isRec(sn)) return null;
  const title = decode(str(sn.title));
  if (!title) return null;
  const status = isRec(raw.status) ? raw.status : {};
  if (status.embeddable === false) return null; // tidak bisa diputar di luar YouTube
  const cd = isRec(raw.contentDetails) ? raw.contentDetails : {};
  return {
    kind: 'video',
    id,
    title,
    subtitle: cleanArtist(decode(str(sn.channelTitle))) || 'Artis tidak diketahui',
    thumb: pickThumb(sn),
    durationSec: parseDuration(str(cd.duration)),
  };
}

async function videoDetails(ids: string[]): Promise<SearchItem[]> {
  if (!ids.length) return [];
  const data = await ytFetch('videos', { part: 'snippet,contentDetails,status', id: ids.slice(0, 50).join(','), maxResults: 50 }, 360 * MIN);
  if (!Array.isArray(data.items)) throw BAD();
  const map = new Map<string, SearchItem>();
  for (const raw of data.items) {
    const it = videoToItem(raw);
    if (it) map.set(it.id, it);
  }
  return ids.map((id) => map.get(id)).filter((x): x is SearchItem => !!x);
}

// ---- endpoint ----
export async function search(q: string, type: 'video' | 'channel' | 'playlist', pageToken: string | undefined, music: boolean): Promise<SearchResponse> {
  const params: Params = { part: 'snippet', q, type, maxResults: 20, pageToken, safeSearch: 'moderate', regionCode: 'ID', relevanceLanguage: 'id' };
  if (type === 'video') {
    params.videoEmbeddable = 'true';
    if (music) params.videoCategoryId = '10';
  }
  const data = await ytFetch('search', params, 30 * MIN);
  if (!Array.isArray(data.items)) throw BAD();
  const nextPageToken = str(data.nextPageToken) || undefined;

  if (type === 'video') {
    const ids = data.items.map((r) => (isRec(r) && isRec(r.id) ? str(r.id.videoId) : '')).filter(Boolean);
    return { items: await videoDetails(ids), nextPageToken };
  }
  const items: SearchItem[] = [];
  for (const r of data.items) {
    if (!isRec(r) || !isRec(r.id) || !isRec(r.snippet)) continue;
    const id = str(type === 'channel' ? r.id.channelId : r.id.playlistId);
    const title = decode(str(r.snippet.title));
    if (!id || !title) continue;
    items.push({
      kind: type,
      id,
      title,
      subtitle: type === 'channel' ? 'Artis' : decode(str(r.snippet.channelTitle)),
      thumb: pickThumb(r.snippet),
    });
  }
  return { items, nextPageToken };
}

export async function chart(region: string): Promise<SearchResponse> {
  const data = await ytFetch('videos', { part: 'snippet,contentDetails,status', chart: 'mostPopular', videoCategoryId: '10', regionCode: region, maxResults: 50 }, 120 * MIN);
  if (!Array.isArray(data.items)) throw BAD();
  const items = data.items.map(videoToItem).filter((x): x is SearchItem => !!x);
  return { items };
}

export async function playlist(id: string, pageToken: string | undefined): Promise<PlaylistResponse> {
  const [meta, page] = await Promise.all([
    ytFetch('playlists', { part: 'snippet', id, maxResults: 1 }, 30 * MIN),
    ytFetch('playlistItems', { part: 'contentDetails', playlistId: id, maxResults: 50, pageToken }, 30 * MIN),
  ]);
  const first = arr(meta.items)[0];
  if (!isRec(first) || !isRec(first.snippet)) throw new ApiError('NOT_FOUND', 404, 'Playlist tidak ditemukan atau bersifat privat.');
  const ids = arr(page.items)
    .map((r) => (isRec(r) && isRec(r.contentDetails) ? str(r.contentDetails.videoId) : ''))
    .filter(Boolean);
  return {
    id,
    title: decode(str(first.snippet.title)),
    description: decode(str(first.snippet.description)).slice(0, 400),
    channel: decode(str(first.snippet.channelTitle)),
    thumb: pickThumb(first.snippet),
    items: await videoDetails(ids),
    nextPageToken: str(page.nextPageToken) || undefined,
  };
}
