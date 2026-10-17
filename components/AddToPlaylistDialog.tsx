'use client';
import { Check, Plus } from 'lucide-react';
import { askText } from '@/stores/dialogs';
import { useLibrary } from '@/stores/library';
import { toast } from '@/stores/toast';
import { useUI } from '@/stores/ui';
import Modal from './Modal';

export default function AddToPlaylistDialog() {
  const track = useUI((s) => s.addTo);
  const close = useUI((s) => s.closeAddTo);
  const playlists = useLibrary((s) => s.playlists);

  const add = (id: string, name: string) => {
    if (!track) return;
    if (useLibrary.getState().addToPlaylist(id, track)) toast(`Ditambahkan ke “${name}”`);
    else toast('Lagu ini sudah ada di playlist');
    close();
  };

  const create = async () => {
    if (!track) return;
    const name = await askText({ title: 'Playlist baru', placeholder: 'Nama playlist', confirmLabel: 'Buat' });
    if (!name) return;
    const id = useLibrary.getState().createPlaylist(name, [track]);
    toast(`Playlist “${name}” dibuat`);
    void id;
    close();
  };

  return (
    <Modal open={!!track} onClose={close} title="Tambah ke playlist">
      <button onClick={create} className="press mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-accent hover:bg-surface2">
        <Plus size={20} aria-hidden="true" /> Playlist baru
      </button>
      {playlists.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">Kamu belum punya playlist.</p>
      ) : (
        <ul>
          {playlists.map((p) => {
            const has = !!track && p.tracks.some((t) => t.id === track.id);
            return (
              <li key={p.id}>
                <button onClick={() => add(p.id, p.name)} className="press flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-surface2">
                  <span className="min-w-0">
                    <span className="block truncate">{p.name}</span>
                    <span className="text-xs text-muted">{p.tracks.length} lagu</span>
                  </span>
                  {has && <Check size={18} className="text-accent" aria-label="Sudah ada" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
