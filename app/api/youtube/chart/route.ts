import { handle } from '@/lib/server/guard';
import { ApiError, chart, search } from '@/lib/server/youtube';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handle(req, async () => {
    const u = new URL(req.url);
    const region = (u.searchParams.get('region') ?? 'ID').toUpperCase();
    if (!/^[A-Z]{2}$/.test(region)) throw new ApiError('BAD_REQUEST', 400, 'Kode wilayah tidak valid.');
    try {
      return await chart(region);
    } catch (e) {
      // Chart musik tidak tersedia di semua wilayah: gunakan pencarian sebagai gantinya.
      if (e instanceof ApiError && e.code === 'NOT_FOUND') return search('lagu hits indonesia terbaru', 'video', undefined, true);
      throw e;
    }
  });
}
