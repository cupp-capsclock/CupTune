'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useApi } from '@/lib/api';
import { useInView } from '@/lib/hooks';
import { thumbOf, toTrack } from '@/lib/tracks';
import type { SearchItem, SearchResponse, Track } from '@/lib/types';
import { usePlayer } from '@/stores/player';
import { useSettings } from '@/stores/settings';
import { useUI } from '@/stores/ui';
import MediaCard from './MediaCard';
import { CardSkeleton, ErrorBox } from './States';

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * Math.max(240, ref.current.clientWidth * 0.8), behavior: 'smooth' });
  return (
    <section aria-label={title} className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="hidden shrink-0 gap-1 md:flex">
          <button onClick={() => scroll(-1)} aria-label={`Geser ${title} ke kiri`} className="press flex h-9 w-9 items-center justify-center rounded-full bg-surface2">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button onClick={() => scroll(1)} aria-label={`Geser ${title} ke kanan`} className="press flex h-9 w-9 items-center justify-center rounded-full bg-surface2">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-proximity gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {children}
      </div>
    </section>
  );
}

export function ItemCard({ item, tracks }: { item: SearchItem; tracks: Track[] }) {
  const q = useSettings((s) => s.thumbQ);
  if (item.kind === 'video') {
    const i = tracks.findIndex((t) => t.id === `yt:${item.id}`);
    const tr = tracks[i];
    if (!tr) return null;
    return (
      <MediaCard
        title={tr.title}
        subtitle={tr.artist}
        thumb={thumbOf(tr, q)}
        label={`Putar ${tr.title} oleh ${tr.artist}`}
        onClick={() => usePlayer.getState().playTracks(tracks, i)}
        onMenu={() => useUI.getState().openMenu(tr)}
      />
    );
  }
  if (item.kind === 'channel') {
    return <MediaCard round title={item.title} subtitle="Artis" thumb={item.thumb} label={`Cari lagu ${item.title}`} href={`/cari?q=${encodeURIComponent(item.title)}`} />;
  }
  return <MediaCard title={item.title} subtitle={item.subtitle} thumb={item.thumb} label={`Buka playlist ${item.title}`} href={`/yt/${item.id}`} />;
}

export function ApiSection({ title, subtitle, url, from = 0, to }: { title: string; subtitle?: string; url: string; from?: number; to?: number }) {
  const [ref, seen] = useInView();
  const { data, error, retry } = useApi<SearchResponse>(url, seen);
  const items = useMemo(() => (data?.items ?? []).slice(from, to), [data, from, to]);
  const tracks = useMemo(() => items.filter((i) => i.kind === 'video').map(toTrack), [items]);

  if (data && items.length === 0) return <div ref={ref} />; // tidak ada data: bagian disembunyikan
  return (
    <div ref={ref}>
      <Section title={title} subtitle={subtitle}>
        {error ? (
          <div className="w-full">
            <ErrorBox message={error.message} onRetry={retry} />
          </div>
        ) : !data ? (
          Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)
        ) : (
          items.map((it) => <ItemCard key={`${it.kind}-${it.id}`} item={it} tracks={tracks} />)
        )}
      </Section>
    </div>
  );
}
