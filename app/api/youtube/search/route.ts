import { handle, pick, token } from '@/lib/server/guard';
import { ApiError, search } from '@/lib/server/youtube';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handle(req, async () => {
    const u = new URL(req.url);
    const q = (u.searchParams.get('q') ?? '').trim().slice(0, 100);
    if (!q) throw new ApiError('BAD_REQUEST', 400, 'Kata kunci pencarian kosong.');
    const type = pick(u, 'type', ['video', 'channel', 'playlist'] as const, 'video');
    return search(q, type, token(u, 'pageToken'), u.searchParams.get('music') === '1');
  });
}
