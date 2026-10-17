'use client';
import { Heart, History, ListMusic, Music2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { addLocalFiles } from '@/lib/localAudio';
import { sortTracks } from '@/lib/tracks';
import type { SortKey } from '@/lib/tracks';
import type { Track } from '@/lib/types';
import { askText, confirmDialog } from '@/stores/dialogs';
import { useLibrary } from '@/stores/library';
import { usePlayer } from '@/stores/player';
import { toast } from '@/stores/toast';
import ListActions from './ListActions';
import { EmptyState } from './States';
import TrackRow from './TrackRow';

const TABS = [
  { id: 'playlist', label: 'Playlist' },
  { id: 'favorit', label: 'Favorit' },
  { id: 'disimpan', label: 'Disimpan' },
  { id: 'lokal', label: 'Audio lokal' },
  { id: 'riwayat', label: 'Riwayat' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function TrackList({ tracks, empty, extraFor }: { tracks: Track[]; empty: React.ReactNode; extraFor?: (t: Track) => { label: string; danger?: boolean; onClick: () => void }[] }) {
  if (!tracks.length) return <>{empty}</>;
  return (
    <>
      <ListActions tracks={tracks} />
      <ul className="mt-3">
        {tracks.map((t, i) => (
          <li key={t.id}>
            <TrackRow track={t} onPlay={() => usePlayer.getState().playTracks(tracks, i)} extra={extraFor?.(t)} />
          </li>
        ))}
      </ul>
    </>
  );
}

export default function LibraryView() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : 'playlist';
  const lib = useLibrary();
  const [sort, setSort] = useState<SortKey>('date');
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const savedYT = useMemo(() => sortTracks(lib.saved.filter((t) => t.source === 'youtube'), sort), [lib.saved, sort]);
  const local = useMemo(() => sortTracks(lib.saved.filter((t) => t.source === 'local'), sort), [lib.saved, sort]);
  const favs = useMemo(() => sortTracks(lib.favorites, sort), [lib.favorites, sort]);

  const newPlaylist = async () => {
    const name = await askText({ title: 'Playlist baru', placeholder: 'Nama playlist', confirmLabel: 'Buat' });
    if (name) {
      const id = lib.createPlaylist(name);
      router.push(`/playlist/${id}`);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const { added, failed } = await addLocalFiles(Array.from(files));
    setBusy(false);
    if (added.length) {
      lib.addSaved(added);
      toast(`${added.length} berkas ditambahkan`);
    }
    if (failed) toast(`${failed} berkas gagal ditambahkan (bukan audio atau penyimpanan penuh)`, 'err');
    if (fileRef.current) fileRef.current.value = '';
  };

  const deleteLocal = async (t: Track) => {
    if (await confirmDialog({ title: 'Hapus berkas?', message: `“${t.title}” akan dihapus dari penyimpanan perangkat ini, termasuk dari semua playlist.`, confirmLabel: 'Hapus', danger: true })) {
      const s = usePlayer.getState();
      const qi = s.queue.findIndex((x) => x.id === t.id);
      if (qi >= 0) s.removeFromQueue(qi);
      await lib.deleteLocal(t.id);
      toast('Berkas dihapus');
    }
  };

  const sortSel = (
    <label className="ml-auto flex items-center gap-2 text-sm text-muted">
      Urutkan
      <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-full border border-line bg-surface px-3 py-2 text-fg">
        <option value="date">Terbaru ditambahkan</option>
        <option value="title">Judul</option>
        <option value="artist">Artis</option>
      </select>
    </label>
  );

  return (
    <div className="pt-2">
      <h1 className="mb-3 text-2xl font-semibold tracking-tight">Pustaka</h1>
      {!lib.storageOk && <p role="alert" className="mb-3 rounded-xl border border-red-400/40 bg-surface p-3 text-sm text-red-300">Penyimpanan lokal tidak tersedia, jadi pustaka tidak akan tersimpan.</p>}
      <div role="tablist" aria-label="Bagian pustaka" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => router.replace(`/pustaka?tab=${t.id}`, { scroll: false })} className={`press shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'playlist' && (
        <>
          <button onClick={newPlaylist} className="press mb-3 flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg">
            <Plus size={18} aria-hidden="true" /> Playlist baru
          </button>
          {lib.playlists.length === 0 ? (
            <EmptyState icon={<ListMusic size={32} aria-hidden="true" />} title="Belum ada playlist" text="Buat playlist untuk mengelompokkan lagu favoritmu." />
          ) : (
            <ul>
              {lib.playlists.map((p) => (
                <li key={p.id} className="flex items-center gap-1 rounded-xl">
                  <Link href={`/playlist/${p.id}`} className="press flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface2 text-muted">
                      <ListMusic size={22} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-muted">{p.tracks.length} lagu</span>
                    </span>
                  </Link>
                  <button
                    aria-label={`Ubah nama ${p.name}`}
                    onClick={async () => {
                      const n = await askText({ title: 'Ubah nama playlist', initial: p.name, confirmLabel: 'Simpan' });
                      if (n) lib.renamePlaylist(p.id, n);
                    }}
                    className="press flex h-10 w-10 items-center justify-center rounded-full text-muted"
                  >
                    <Pencil size={17} aria-hidden="true" />
                  </button>
                  <button
                    aria-label={`Hapus ${p.name}`}
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Hapus playlist?', message: `“${p.name}” berisi ${p.tracks.length} lagu. Playlist ini akan dihapus dari perangkat.`, confirmLabel: 'Hapus', danger: true })) {
                        lib.deletePlaylist(p.id);
                        toast('Playlist dihapus');
                      }
                    }}
                    className="press flex h-10 w-10 items-center justify-center rounded-full text-muted"
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'favorit' && (
        <>
          <div className="mb-3 flex">{sortSel}</div>
          <TrackList tracks={favs} empty={<EmptyState icon={<Heart size={32} aria-hidden="true" />} title="Belum ada favorit" text="Tekan ikon hati di pemutar atau menu lagu untuk menyimpan favorit." />} />
        </>
      )}

      {tab === 'disimpan' && (
        <>
          <div className="mb-3 flex">{sortSel}</div>
          <TrackList tracks={savedYT} empty={<EmptyState icon={<Music2 size={32} aria-hidden="true" />} title="Belum ada lagu tersimpan" text="Pilih “Simpan ke pustaka” dari menu lagu." />} />
        </>
      )}

      {tab === 'lokal' && (
        <>
          <p className="mb-3 text-sm text-muted">Berkas audio milikmu sendiri. Disimpan di browser perangkat ini dan tidak diunggah ke server.</p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
            <button disabled={busy} onClick={() => fileRef.current?.click()} className="press flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-50">
              <Upload size={16} aria-hidden="true" /> {busy ? 'Menambahkan…' : 'Tambah berkas audio'}
            </button>
            {sortSel}
          </div>
          <TrackList
            tracks={local}
            empty={<EmptyState icon={<Upload size={32} aria-hidden="true" />} title="Belum ada audio lokal" text="Tambahkan berkas MP3, M4A, atau format audio lain dari perangkatmu." />}
            extraFor={(t) => [{ label: 'Hapus berkas', danger: true, onClick: () => void deleteLocal(t) }]}
          />
        </>
      )}

      {tab === 'riwayat' && (
        <>
          {lib.recents.length > 0 && (
            <button
              onClick={async () => {
                if (await confirmDialog({ title: 'Hapus riwayat pemutaran?', message: 'Daftar “Baru Diputar” akan dikosongkan.', confirmLabel: 'Hapus', danger: true })) {
                  lib.clearRecents();
                  toast('Riwayat dihapus');
                }
              }}
              className="press mb-3 rounded-full bg-surface2 px-4 py-2.5 text-sm font-medium"
            >
              Hapus riwayat
            </button>
          )}
          <TrackList tracks={lib.recents} empty={<EmptyState icon={<History size={32} aria-hidden="true" />} title="Belum ada riwayat" text="Lagu yang kamu putar akan tercatat di sini." />} />
        </>
      )}
    </div>
  );
}
