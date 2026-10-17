'use client';
import { MoreVertical } from 'lucide-react';
import { fmtTime } from '@/lib/format';
import type { Track } from '@/lib/types';
import { usePlayer } from '@/stores/player';
import { useUI } from '@/stores/ui';
import type { MenuAction } from '@/stores/ui';
import Artwork from './Artwork';

export function NowBars() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
      {[0, 0.3, 0.6].map((d) => (
        <span key={d} className="h-full w-0.5 origin-bottom animate-eq rounded-full bg-accent" style={{ animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}

export default function TrackRow({ track, onPlay, extra }: { track: Track; onPlay: () => void; extra?: MenuAction[] }) {
  const active = usePlayer((s) => s.queue[s.index]?.id === track.id);
  const playing = usePlayer((s) => s.status === 'playing');
  return (
    <div className={`flex items-center gap-1 rounded-xl ${active ? 'bg-surface' : ''}`}>
      <button onClick={onPlay} aria-label={`Putar ${track.title} oleh ${track.artist}`} className="press flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left">
        <Artwork track={track} size={48} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm ${active ? 'font-semibold text-accent' : 'font-medium'}`}>{track.title}</span>
          <span className="block truncate text-xs text-muted">
            {track.artist}
            {track.durationSec ? ` · ${fmtTime(track.durationSec)}` : ''}
          </span>
        </span>
        {active && playing && <NowBars />}
      </button>
      <button onClick={() => useUI.getState().openMenu(track, extra)} aria-label={`Menu untuk ${track.title}`} className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted">
        <MoreVertical size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
