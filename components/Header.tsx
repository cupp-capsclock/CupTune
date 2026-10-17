'use client';
import { History, ListMusic, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePlayer } from '@/stores/player';
import { Wordmark } from './Logo';

export default function Header() {
  const count = usePlayer((s) => s.queue.length);
  const btn = 'press relative flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-fg';
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-bg/95 px-4 pb-1 pt-[calc(env(safe-area-inset-top)+0.25rem)] backdrop-blur-sm md:px-8">
      <Link href="/" className="md:invisible" aria-label="CupTune, ke Beranda">
        <Wordmark />
      </Link>
      <div className="flex items-center">
        <Link href="/pustaka?tab=riwayat" className={btn} aria-label="Riwayat pemutaran">
          <History size={22} aria-hidden="true" />
        </Link>
        <button onClick={() => usePlayer.getState().setQueueOpen(true)} className={btn} aria-label={`Antrean, ${count} lagu`}>
          <ListMusic size={22} aria-hidden="true" />
          {count > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-accent-fg">{count > 99 ? '99+' : count}</span>}
        </button>
        <Link href="/pengaturan" className={btn} aria-label="Pengaturan">
          <Settings size={22} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
