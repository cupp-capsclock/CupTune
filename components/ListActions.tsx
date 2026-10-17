'use client';
import { ListPlus, Play, Shuffle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Track } from '@/lib/types';
import { usePlayer } from '@/stores/player';

export default function ListActions({ tracks, children }: { tracks: Track[]; children?: ReactNode }) {
  const off = tracks.length === 0;
  const b = 'press flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-40';
  return (
    <div className="flex flex-wrap gap-2">
      <button disabled={off} onClick={() => usePlayer.getState().playTracks(tracks, 0)} className={`${b} bg-accent text-accent-fg`}>
        <Play size={16} fill="currentColor" aria-hidden="true" /> Putar semua
      </button>
      <button disabled={off} onClick={() => usePlayer.getState().playShuffled(tracks)} className={`${b} bg-surface2`}>
        <Shuffle size={16} aria-hidden="true" /> Acak
      </button>
      <button disabled={off} onClick={() => usePlayer.getState().addManyToQueue(tracks)} className={`${b} bg-surface2`}>
        <ListPlus size={16} aria-hidden="true" /> Tambah ke antrean
      </button>
      {children}
    </div>
  );
}
