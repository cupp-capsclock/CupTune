'use client';
import { Clock, Loader2, Search, SearchX, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientApiError, apiGet, toErr } from '@/lib/api';
import { qs } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { SUGGESTIONS } from '@/lib/moods';
import { toTrack } from '@/lib/tracks';
import type { SearchItem, SearchResponse } from '@/lib/types';
import { usePlayer } from '@/stores/player';
import { useSearches } from '@/stores/searches';
import { useUI } from '@/stores/ui';
import { EmptyState, ErrorBox, RowSkeleton } from './States';
import TrackRow from './TrackRow';

type Kind = 'video' | 'channel' | 'playlist';
const TABS: { id: Kind; label: string }[] = [
  { id: 'video', label: 'Lagu' },
  { id: 'channel', label: 'Artis' },
  { id: 'playlist', label: 'Playlist' },
];
const MAX_ITEMS = 120;

function useResults(q: string, type: Kind) {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [next, setNext] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClientApiError | null>(null);
  const [loaded, setLoaded] = useState(false);
  const req = useRef(0);

  const fetchPage = useCallback(
    async (token?: string, force = false) => {
      const id = ++req.current;
      setLoading(true);
      setError(null);
      try {
        const r = await apiGet<SearchResponse>('/api/youtube/search?' + qs({ q, type, pageToken: token }), force ? 0 : undefined);
        if (id !== req.current) return;
        setItems((prev) => {
          const merged = token ? [...prev, ...r.items] : r.items;
          const seen = new Set<string>();
          return merged.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).slice(0, MAX_ITEMS);
        });
        setNext(r.nextPageToken);
        setLoaded(true);
      } catch (e) {
        if (id === req.current) setError(toErr(e));
      } finally {
        if (id === req.current) setLoading(false);
      }
    },
    [q, type],
  );

  useEffect(() => {
    setItems([]);
    setNext(undefined);
    setError(null);
    setLoaded(false);
    if (q.length >= 2) void fetchPage();
    else {
      req.current++;
      setLoading(false);
    }
  }, [q, type, fetchPage]);

  return { items, next, loading, error, loaded, more: () => next && fetchPage(next), retry: () => fetchPage(undefined, true) };
}

export default function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const [input, setInput] = useState(initial);
  const [type, setType] = useState<Kind>('video');
  const debounced = useDebounced(input.trim(), 450);
  const { items, next, loading, error, loaded, more, retry } = useResults(debounced, type);
  const history = useSearches();
  const sentinel = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sinkronkan ketika q di URL berubah (mis. dari kartu artis).
  useEffect(() => {
    const q = params.get('q') ?? '';
    if (q) setInput(q);
  }, [params]);

  const commit = (q: string) => {
    const t = q.trim();
    setInput(t);
    if (t.length >= 2) {
      history.add(t);
      router.replace(`/cari?${qs({ q: t })}`, { scroll: false });
    }
  };

  // Scroll tak terbatas.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next || loading || error) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && void more(), { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [next, loading, error, more]);

  const tracks = items.filter((i) => i.kind === 'video').map(toTrack);
  const active = debounced.length >= 2;

  return (
    <div className="pt-2">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          commit(input);
        }}
        className="sticky top-14 z-20 -mx-4 bg-bg/95 px-4 pb-2 pt-1 backdrop-blur-sm md:top-16 md:mx-0 md:px-0"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={input}
            maxLength={100}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setInput('');
                router.replace('/cari', { scroll: false });
              }
            }}
            placeholder="Cari lagu, artis, atau playlist"
            aria-label="Cari musik"
            className="h-12 w-full rounded-full border border-line bg-surface pl-12 pr-12 text-base outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                router.replace('/cari', { scroll: false });
                inputRef.current?.focus();
              }}
              aria-label="Kosongkan pencarian"
              className="press absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {active && (
          <div role="tablist" aria-label="Jenis hasil" className="mt-3 flex gap-2">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={type === t.id} onClick={() => setType(t.id)} className={`press rounded-full border px-4 py-1.5 text-sm font-medium ${type === t.id ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </form>

      {!active && (
        <div className="mt-4 space-y-8">
          {history.items.length > 0 && (
            <section aria-label="Pencarian terakhir">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold">Pencarian terakhir</h2>
                <button onClick={() => history.clear()} className="press rounded-full px-3 py-1.5 text-sm text-muted">
                  Hapus semua
                </button>
              </div>
              <ul>
                {history.items.map((h) => (
                  <li key={h} className="flex items-center">
                    <button onClick={() => commit(h)} className="press flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2.5 text-left text-sm">
                      <Clock size={18} className="shrink-0 text-muted" aria-hidden="true" />
                      <span className="truncate">{h}</span>
                    </button>
                    <button onClick={() => history.remove(h)} aria-label={`Hapus “${h}” dari riwayat`} className="press flex h-10 w-10 items-center justify-center rounded-full text-muted">
                      <X size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-label="Saran pencarian">
            <h2 className="mb-2 text-base font-semibold">Saran pencarian</h2>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => commit(s)} className="press rounded-full border border-line bg-surface px-4 py-2 text-sm">
                  {s}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {active && (
        <div className="mt-2" aria-live="polite">
          {error && !items.length ? (
            <ErrorBox message={error.message} onRetry={retry} />
          ) : loading && !items.length ? (
            <RowSkeleton />
          ) : loaded && !items.length ? (
            <EmptyState icon={<SearchX size={32} aria-hidden="true" />} title="Tidak ada hasil" text={`Tidak ada hasil untuk “${debounced}”. Coba kata kunci lain atau jenis hasil yang berbeda.`} />
          ) : (
            <ul>
              {items.map((it) => (
                <li key={`${it.kind}-${it.id}`}>
                  {it.kind === 'video' ? (
                    <TrackRow
                      track={toTrack(it)}
                      onPlay={() => {
                        history.add(debounced);
                        usePlayer.getState().playTracks(tracks, tracks.findIndex((t) => t.id === `yt:${it.id}`));
                      }}
                    />
                  ) : (
                    <Link
                      href={it.kind === 'playlist' ? `/yt/${it.id}` : `/cari?${qs({ q: it.title })}`}
                      onClick={() => it.kind === 'channel' && setType('video')}
                      className="press flex items-center gap-3 rounded-xl p-2"
                    >
                      <span className={`h-12 w-12 shrink-0 overflow-hidden bg-surface2 ${it.kind === 'channel' ? 'rounded-full' : 'rounded-lg'}`}>
                        {it.thumb && <img src={it.thumb} alt={`Sampul ${it.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{it.title}</span>
                        <span className="block truncate text-xs text-muted">{it.kind === 'channel' ? 'Artis · lihat lagu' : `Playlist · ${it.subtitle}`}</span>
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {error && items.length > 0 && <div className="mt-3"><ErrorBox message={error.message} onRetry={() => void more()} /></div>}
          <div ref={sentinel} className="flex h-16 items-center justify-center">
            {loading && items.length > 0 && <Loader2 className="animate-spin text-muted" size={22} aria-label="Memuat lebih banyak" />}
            {!loading && next && !error && (
              <button onClick={() => void more()} className="press rounded-full bg-surface2 px-4 py-2 text-sm">
                Muat lebih banyak
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
