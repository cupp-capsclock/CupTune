import type { SearchItem, Track } from './types';

export type ThumbQ = 'low' | 'high';

export function toTrack(it: SearchItem): Track {
  return {
    id: `yt:${it.id}`,
    source: 'youtube',
    videoId: it.id,
    title: it.title,
    artist: it.subtitle,
    durationSec: it.durationSec,
  };
}

export function thumbOf(t: Track, q: ThumbQ = 'low'): string | undefined {
  if (t.source === 'youtube' && t.videoId) {
    return `https://i.ytimg.com/vi/${t.videoId}/${q === 'high' ? 'hqdefault' : 'mqdefault'}.jpg`;
  }
  return undefined;
}

export type SortKey = 'date' | 'title' | 'artist';

export function sortTracks(list: Track[], by: SortKey): Track[] {
  const c = [...list];
  if (by === 'title') c.sort((a, b) => a.title.localeCompare(b.title, 'id'));
  else if (by === 'artist') c.sort((a, b) => a.artist.localeCompare(b.artist, 'id'));
  else c.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
  return c;
}

export function shuffled<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
