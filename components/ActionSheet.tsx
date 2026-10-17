'use client';
import { Bookmark, Heart, ListMusic, ListPlus, SkipForward } from 'lucide-react';
import { useLibrary } from '@/stores/library';
import { usePlayer } from '@/stores/player';
import { useUI } from '@/stores/ui';
import Artwork from './Artwork';
import Modal from './Modal';

export default function ActionSheet() {
  const menu = useUI((s) => s.menu);
  const close = useUI((s) => s.closeMenu);
  const fav = useLibrary((s) => (menu ? s.favorites.some((f) => f.id === menu.track.id) : false));
  const saved = useLibrary((s) => (menu ? s.saved.some((f) => f.id === menu.track.id) : false));
  const t = menu?.track;

  const item = 'press flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-surface2';
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <Modal open={!!menu} onClose={close} title="Menu lagu">
      {t && (
        <>
          <div className="mb-2 flex items-center gap-3 px-1">
            <Artwork track={t} size={48} />
            <div className="min-w-0">
              <p className="truncate font-medium">{t.title}</p>
              <p className="truncate text-sm text-muted">{t.artist}</p>
            </div>
          </div>
          <div className="border-t border-line pt-2">
            <button className={item} onClick={run(() => usePlayer.getState().playNext(t))}>
              <SkipForward size={20} aria-hidden="true" /> Putar berikutnya
            </button>
            <button className={item} onClick={run(() => usePlayer.getState().addToQueue(t))}>
              <ListPlus size={20} aria-hidden="true" /> Tambah ke antrean
            </button>
            <button className={item} onClick={run(() => useLibrary.getState().toggleFavorite(t))}>
              <Heart size={20} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" /> {fav ? 'Hapus dari favorit' : 'Tambah ke favorit'}
            </button>
            {t.source === 'youtube' && (
              <button className={item} onClick={run(() => useLibrary.getState().toggleSaved(t))}>
                <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /> {saved ? 'Hapus dari pustaka' : 'Simpan ke pustaka'}
              </button>
            )}
            <button className={item} onClick={() => useUI.getState().openAddTo(t)}>
              <ListMusic size={20} aria-hidden="true" /> Tambah ke playlist
            </button>
            {menu.extra.map((a) => (
              <button key={a.label} className={`${item} ${a.danger ? 'text-red-400' : ''}`} onClick={run(a.onClick)}>
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
