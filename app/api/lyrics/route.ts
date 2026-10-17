import { handle } from '@/lib/server/guard';
import { findLyrics } from '@/lib/server/lyrics';
import { ApiError } from '@/lib/server/youtube';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handle(req, async () => {
    const u = new URL(req.url);
    const clip = (k: string) => (u.searchParams.get(k) ?? '').trim().slice(0, 120) || undefined;
    const q = clip('q');
    const title = clip('title');
    if (!q && !title) throw new ApiError('BAD_REQUEST', 400, 'Judul lagu kosong.');
    return findLyrics({ q, title, artist: clip('artist') });
  });
}
