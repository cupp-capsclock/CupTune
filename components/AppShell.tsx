'use client';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useEq } from '@/stores/eq';
import { useLibrary } from '@/stores/library';
import { useSearches } from '@/stores/searches';
import { useSettings } from '@/stores/settings';
import ActionSheet from './ActionSheet';
import AddToPlaylistDialog from './AddToPlaylistDialog';
import BottomNav from './BottomNav';
import DialogHost from './DialogHost';
import ExpandedPlayer from './ExpandedPlayer';
import Header from './Header';
import MiniPlayer from './MiniPlayer';
import PlayerEngine from './PlayerEngine';
import QueuePanel from './QueuePanel';
import Sidebar from './Sidebar';
import Toasts from './Toasts';

export default function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    useSettings.getState().hydrate();
    useEq.getState().hydrate();
    useSearches.getState().hydrate();
    void useLibrary.getState().load();
  }, []);

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-[100] rounded bg-accent px-3 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        Lewati ke konten
      </a>
      <Sidebar />
      <div className="md:pl-60">
        <Header />
        <main id="main" className="mx-auto max-w-5xl px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-32">
          {children}
          <footer className="mt-12 border-t border-line pt-4 text-center text-xs text-muted">© 2026 CupTune — Made by MkdirCup</footer>
        </main>
      </div>
      <BottomNav />
      <MiniPlayer />
      <ExpandedPlayer />
      <QueuePanel />
      <PlayerEngine />
      <ActionSheet />
      <AddToPlaylistDialog />
      <DialogHost />
      <Toasts />
    </div>
  );
}
