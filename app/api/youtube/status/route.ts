import { isConfigured } from '@/lib/server/youtube';

export const dynamic = 'force-dynamic';

// Hanya mengabarkan apakah key sudah diatur. Nilai key tidak pernah dikirim.
export async function GET() {
  return Response.json({ configured: isConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}
