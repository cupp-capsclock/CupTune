'use client';
import { Bookmark, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Crumbs from '@/components/Crumbs';
import ListActions from '@/components/ListActions';
import { EmptyState, ErrorBox, RowSkeleton } from '@/components/States';
import TrackRow from '@/components/TrackRow';
import { ClientApiError, apiGet, toErr } from '@/lib/api';
import { qs } from '@/lib/format';
import { toTrack } from '@/lib/tracks';
import type { PlaylistResponse, SearchItem } from '@/lib/types';
import { useLibrary } from '@/stores/library';
import { usePlayer } from '@/stores/player';
import { toast } from '@/stores/toast';

export default function ExternalPlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [meta, setMeta] = useState<Omit<PlaylistResponse, 'items' | 'nextPageToken'> | null>(null);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [next, setNext] = useState<string | undefined>();
  const [error, setError] = useState<ClientApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    apiGet<PlaylistResponse>('/api/youtube/playlist?' + qs({ id }), nonce ? 0 : undefined)
      .then((r) => {
        if (!alive) return;
        const { items: its, nextPageToken, ...m } = r;
        setMeta(m);
        setItems(its);
        setNext(nextPageToken);
      })
      .catch((e) => alive && setError(toErr(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, nonce]);

  const loadMore = async () => {
    if (!next) return;
    setLoading(true);
    try {
      const r = await apiGet<PlaylistResponse>('/api/youtube/playlist?' + qs({ id, pageToken: next }));
      setItems((p) => {
        const seen = new Set(p.map((x) => x.id));
        return [...p, ...r.items.filter((x) => !seen.has(x.id))];
      });
      setNext(r.nextPageToken);
    } catch (e) {
      setError(toErr(e));
    } finally {
      setLoading(false);
    }
  };

  const tracks = useMemo(() => items.map(toTrack), [items]);

  const save = () => {
    if (!meta || !tracks.length) return;
    const pid = useLibrary.getState().createPlaylist(meta.title, tracks);
    toast(`Disimpan sebagai playlist “${meta.title}”`);
    router.push(`/playlist/${pid}`);
  };

  return (
    <div className="pt-2">
      <Crumbs trail={[{ href: '/', label: 'Beranda' }]} current={meta?.title ?? 'Playlist'} />
      {error && !meta ? (
        <ErrorBox message={error.message} onRetry={() => setNonce((n) => n + 1)} />
      ) : !meta ? (
        <RowSkeleton />
      ) : (
        <>
          <div className="mb-4 flex items-start gap-4">
            {meta.thumb && <img src={meta.thumb} alt={`Sampul ${meta.title}`} className="h-28 w-28 shrink-0 rounded-2xl object-cover" />}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight">{meta.title}</h1>
              <p className="mt-1 text-sm text-muted">Playlist YouTube{meta.channel ? ` · ${meta.channel}` : ''}</p>
              {meta.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{meta.description}</p>}
            </div>
          </div>
          <ListActions tracks={tracks}>
            <button onClick={save} disabled={!tracks.length} className="press flex items-center gap-2 rounded-full bg-surface2 px-4 py-2.5 text-sm font-medium disabled:opacity-40">
              <Bookmark size={16} aria-hidden="true" /> Simpan ke pustaka
            </button>
          </ListActions>
          {items.length === 0 && !loading ? (
            <div className="mt-4">
              <EmptyState title="Tidak ada lagu yang bisa diputar" text="Isi playlist ini mungkin privat atau dibatasi pemiliknya." />
            </div>
          ) : (
            <ul className="mt-3">
              {tracks.map((t, i) => (
                <li key={t.id}>
                  <TrackRow track={t} onPlay={() => usePlayer.getState().playTracks(tracks, i)} />
                </li>
              ))}
            </ul>
          )}
          {error && <div className="mt-3"><ErrorBox message={error.message} onRetry={() => void loadMore()} /></div>}
          <div className="flex h-16 items-center justify-center">
            {loading ? <Loader2 className="animate-spin text-muted" aria-label="Memuat" /> : next && <button onClick={() => void loadMore()} className="press rounded-full bg-surface2 px-4 py-2 text-sm">Muat lebih banyak</button>}
          </div>
        </>
      )}
    </div>
  );
}
