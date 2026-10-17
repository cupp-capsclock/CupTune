'use client';
import { ListMusic, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';
import { fmtTime } from '@/lib/format';
import { confirmDialog } from '@/stores/dialogs';
import { usePlayer } from '@/stores/player';
import Artwork from './Artwork';
import { EmptyState } from './States';

export default function QueuePanel() {
  const open = usePlayer((s) => s.queueOpen);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const status = usePlayer((s) => s.status);
  const p = usePlayer.getState;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        p().setQueueOpen(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, p]);

  if (!open) return null;

  const clear = async () => {
    if (queue.length <= 1) return;
    if (await confirmDialog({ title: 'Kosongkan antrean?', message: 'Semua lagu setelah lagu yang sedang diputar akan dihapus dari antrean.', confirmLabel: 'Kosongkan', danger: true })) p().clearQueue();
  };

  return (
    <div className="fixed inset-0 z-[75] flex justify-end" role="presentation">
      <div className="absolute inset-0 animate-fade bg-black/50" onClick={() => p().setQueueOpen(false)} />
      <aside role="dialog" aria-modal="true" aria-label="Antrean pemutaran" className="relative flex h-full w-full animate-sheet flex-col bg-surface pt-[env(safe-area-inset-top)] sm:max-w-sm sm:border-l sm:border-line">
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-semibold">Antrean</h2>
            <p className="text-xs text-muted">{queue.length} lagu</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={clear} disabled={queue.length <= 1} className="press rounded-full px-3 py-2 text-sm text-muted disabled:opacity-40">
              Kosongkan
            </button>
            <button onClick={() => p().setQueueOpen(false)} aria-label="Tutup antrean" className="press flex h-10 w-10 items-center justify-center rounded-full">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {queue.length === 0 ? (
            <EmptyState icon={<ListMusic size={32} aria-hidden="true" />} title="Antrean kosong" text="Putar lagu atau pilih “Tambah ke antrean” dari menu lagu." />
          ) : (
            <ul>
              {queue.map((t, i) => {
                const cur = i === index;
                return (
                  <li key={`${t.id}-${i}`} className={`flex items-center gap-1 rounded-xl ${cur ? 'bg-surface2' : ''}`}>
                    <button onClick={() => p().jumpTo(i)} aria-label={`Putar ${t.title}`} aria-current={cur ? 'true' : undefined} className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left">
                      <Artwork track={t} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${cur ? 'font-semibold text-accent' : ''}`}>{t.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {cur && status === 'playing' ? 'Sedang diputar · ' : ''}
                          {t.artist}
                          {t.durationSec ? ` · ${fmtTime(t.durationSec)}` : ''}
                        </span>
                      </span>
                    </button>
                    <button onClick={() => p().removeFromQueue(i)} aria-label={`Hapus ${t.title} dari antrean`} className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted">
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
