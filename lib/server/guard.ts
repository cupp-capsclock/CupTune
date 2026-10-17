import { ApiError } from './youtube';

const hits = new Map<string, { n: number; reset: number }>();
const LIMIT = 90; // permintaan per menit per IP
const WINDOW = 60_000;

function limited(req: Request): boolean {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + WINDOW });
    return false;
  }
  h.n++;
  return h.n > LIMIT;
}

export function pick<T extends string>(u: URL, name: string, allowed: readonly T[], fallback: T): T {
  const v = u.searchParams.get(name);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function token(u: URL, name: string, max = 100): string | undefined {
  const v = u.searchParams.get(name);
  if (!v) return undefined;
  if (!/^[A-Za-z0-9_-]+$/.test(v) || v.length > max) throw new ApiError('BAD_REQUEST', 400, 'Parameter tidak valid.');
  return v;
}

export async function handle(req: Request, fn: () => Promise<unknown>): Promise<Response> {
  if (limited(req)) {
    return Response.json({ error: { code: 'RATE_LIMIT', message: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.' } }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } });
  }
  try {
    const data = await fn();
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (e) {
    if (e instanceof ApiError) {
      return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ error: { code: 'UPSTREAM', message: 'Terjadi kesalahan pada server.' } }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
