import { handle, token } from '@/lib/server/guard';
import { ApiError, playlist } from '@/lib/server/youtube';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handle(req, async () => {
    const u = new URL(req.url);
    const id = token(u, 'id', 64);
    if (!id) throw new ApiError('BAD_REQUEST', 400, 'ID playlist tidak ada.');
    return playlist(id, token(u, 'pageToken'));
  });
}
