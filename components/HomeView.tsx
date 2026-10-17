'use client';
import { KeyRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApi } from '@/lib/api';
import { qs } from '@/lib/format';
import { MOODS } from '@/lib/moods';
import { thumbOf } from '@/lib/tracks';
import { useLibrary } from '@/stores/library';
import { usePlayer } from '@/stores/player';
import { useSettings } from '@/stores/settings';
import { useUI } from '@/stores/ui';
import MediaCard from './MediaCard';
import { ApiSection, Section } from './Section';
import { CardSkeleton, ErrorBox } from './States';

const CHART = '/api/youtube/chart?region=ID';
const search = (q: string, extra: Record<string, string> = {}) => '/api/youtube/search?' + qs({ q, ...extra });

export default function HomeView() {
  const [mood, setMood] = useState<string | null>(null);
  const status = useApi<{ configured: boolean }>('/api/youtube/status');
  const recents = useLibrary((s) => s.recents);
  const q = useSettings((s) => s.thumbQ);
  const m = MOODS.find((x) => x.id === mood) ?? null;
  const configured = status.data?.configured;

  const lastArtist = useMemo(() => recents.find((r) => r.source === 'youtube')?.artist, [recents]);

  return (
    <div className="pt-2">
      <div role="group" aria-label="Pilih mood" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {MOODS.map((x) => {
          const on = x.id === mood;
          return (
            <button key={x.id} onClick={() => setMood(on ? null : x.id)} aria-pressed={on} className={`press shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${on ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface text-fg'}`}>
              {x.label}
            </button>
          );
        })}
      </div>

      {status.error && (
        <div className="mt-6">
          <ErrorBox message={status.error.message} onRetry={status.retry} />
        </div>
      )}

      {configured === false && (
        <div role="status" className="mt-6 flex gap-3 rounded-2xl border border-line bg-surface p-4">
          <KeyRound className="mt-0.5 shrink-0 text-accent" size={20} aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">API key YouTube belum diatur</p>
            <p className="mt-1 text-muted">Isi <code>YOUTUBE_API_KEY</code> di file <code>.env.local</code> (lihat <code>.env.example</code>), lalu jalankan ulang server. Sementara itu kamu tetap bisa memutar audio dari perangkatmu lewat menu Pustaka.</p>
          </div>
        </div>
      )}

      {configured === undefined && !status.error && (
        <Section title="Pilihan Cepat">
          {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
        </Section>
      )}

      {configured && (
        <ApiSection title={m ? `Pilihan Cepat · ${m.label}` : 'Pilihan Cepat'} url={m ? search(m.q, { music: '1' }) : CHART} from={0} to={10} />
      )}

      <Section title="Baru Diputar">
        {recents.length === 0 ? (
          <p className="py-6 text-sm text-muted">Belum ada lagu yang diputar. Lagu yang kamu dengarkan akan muncul di sini.</p>
        ) : (
          recents.slice(0, 12).map((t, i, arr) => (
            <MediaCard
              key={t.id}
              title={t.title}
              subtitle={t.artist}
              thumb={thumbOf(t, q)}
              label={`Putar ${t.title} oleh ${t.artist}`}
              onClick={() => usePlayer.getState().playTracks(arr, i)}
              onMenu={() => useUI.getState().openMenu(t)}
            />
          ))
        )}
      </Section>

      {configured && (
        <>
          <ApiSection
            title="Rekomendasi Untukmu"
            subtitle={lastArtist ? `Karena kamu baru mendengarkan ${lastArtist}` : undefined}
            url={search(lastArtist ? `${lastArtist} lagu` : 'lagu terbaik indonesia', { music: '1' })}
          />
          <ApiSection title="Hits Indonesia" url={CHART} from={10} to={30} />
          <ApiSection title="Pop Indonesia" url={search('lagu pop indonesia', { music: '1' })} />
          <ApiSection title="Rock Indonesia" url={search('lagu rock indonesia', { music: '1' })} />
          <ApiSection title="Indie Indonesia" url={search('lagu indie indonesia', { music: '1' })} />
          <ApiSection title="Musik Nostalgia" url={search('lagu nostalgia indonesia 2000an', { music: '1' })} />

          {m ? (
            <ApiSection title={`Berdasarkan Mood · ${m.label}`} subtitle="Playlist yang cocok dengan moodmu" url={search(m.q, { type: 'playlist' })} />
          ) : (
            <Section title="Berdasarkan Mood">
              <p className="py-4 text-sm text-muted">Pilih salah satu mood di atas untuk melihat lagu dan playlist yang cocok.</p>
            </Section>
          )}

          <ApiSection title="Temukan Artis" url={search('penyanyi indonesia', { type: 'channel' })} />
          <ApiSection title="Playlist Pilihan" url={search('playlist lagu indonesia terbaik', { type: 'playlist' })} />
          <ApiSection title="Hasil Populer" url={CHART} from={30} to={50} />
        </>
      )}
    </div>
  );
}
