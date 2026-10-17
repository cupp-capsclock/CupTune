'use client';
import { ListMusic, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Crumbs from '@/components/Crumbs';
import ListActions from '@/components/ListActions';
import { EmptyState } from '@/components/States';
import TrackRow from '@/components/TrackRow';
import { askText, confirmDialog } from '@/stores/dialogs';
import { useLibrary } from '@/stores/library';
import { usePlayer } from '@/stores/player';
import { toast } from '@/stores/toast';

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const loaded = useLibrary((s) => s.loaded);
  const pl = useLibrary((s) => s.playlists.find((p) => p.id === id));
  const lib = useLibrary.getState;

  if (!loaded) return <p className="py-10 text-center text-sm text-muted">Memuat playlist…</p>;
  if (!pl) {
    return (
      <div className="pt-4">
        <EmptyState icon={<ListMusic size={32} aria-hidden="true" />} title="Playlist tidak ditemukan" text="Playlist ini mungkin sudah dihapus." action={<Link href="/pustaka" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg">Ke Pustaka</Link>} />
      </div>
    );
  }

  return (
    <div className="pt-2">
      <Crumbs trail={[{ href: '/pustaka', label: 'Pustaka' }]} current={pl.name} />
      <div className="mb-4 flex items-center gap-4">
        <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-surface2 text-muted">
          <ListMusic size={40} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{pl.name}</h1>
          <p className="text-sm text-muted">Playlist milikmu · {pl.tracks.length} lagu</p>
        </div>
      </div>
      <ListActions tracks={pl.tracks}>
        <button
          aria-label="Ubah nama playlist"
          onClick={async () => {
            const n = await askText({ title: 'Ubah nama playlist', initial: pl.name, confirmLabel: 'Simpan' });
            if (n) lib().renamePlaylist(pl.id, n);
          }}
          className="press flex items-center gap-2 rounded-full bg-surface2 px-4 py-2.5 text-sm font-medium"
        >
          <Pencil size={16} aria-hidden="true" /> Ubah nama
        </button>
        <button
          aria-label="Hapus playlist"
          onClick={async () => {
            if (await confirmDialog({ title: 'Hapus playlist?', message: `“${pl.name}” akan dihapus dari perangkat ini.`, confirmLabel: 'Hapus', danger: true })) {
              lib().deletePlaylist(pl.id);
              toast('Playlist dihapus');
              router.replace('/pustaka');
            }
          }}
          className="press flex items-center gap-2 rounded-full bg-surface2 px-4 py-2.5 text-sm font-medium text-red-400"
        >
          <Trash2 size={16} aria-hidden="true" /> Hapus
        </button>
      </ListActions>
      {pl.tracks.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Playlist masih kosong" text="Tambahkan lagu lewat menu ⋮ pada lagu mana pun." action={<Link href="/cari" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg">Cari lagu</Link>} />
        </div>
      ) : (
        <ul className="mt-3">
          {pl.tracks.map((t, i) => (
            <li key={t.id}>
              <TrackRow track={t} onPlay={() => usePlayer.getState().playTracks(pl.tracks, i)} extra={[{ label: 'Hapus dari playlist', danger: true, onClick: () => lib().removeFromPlaylist(pl.id, t.id) }]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
