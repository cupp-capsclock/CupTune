'use client';
import { AlignCenter, ChevronDown, Heart, ListMusic, Loader2, MoreVertical, Moon, Music2, Pause, Play, RefreshCw, Repeat, Repeat1, Share2, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { useLibrary } from '@/stores/library';
import { usePlayer } from '@/stores/player';
import { useSlot } from '@/stores/slot';
import { toast } from '@/stores/toast';
import { useUI } from '@/stores/ui';
import Artwork from './Artwork';
import EqualizerPanel from './EqualizerPanel';
import LyricsPanel from './LyricsPanel';
import { SeekBar, VolumeControl } from './PlayerControls';
import Visualizer from './Visualizer';

// Grup tombol kecil di baris bawah (outline, ujung membulat penuh)
const seg = 'press flex h-12 w-[52px] items-center justify-center border border-tone-on/35 transition-colors';
const segOn = 'border-transparent bg-tone-on text-tone-bg';
const SLEEP_MIN = [15, 30, 45, 60];

export default function ExpandedPlayer() {
  const expanded = usePlayer((s) => s.expanded);
  const track = usePlayer((s) => s.queue[s.index]);
  const index = usePlayer((s) => s.index);
  const total = usePlayer((s) => s.queue.length);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const p = usePlayer.getState;
  const fav = useLibrary((s) => (track ? s.favorites.some((f) => f.id === track.id) : false));
  const slotRef = useCallback((el: HTMLElement | null) => useSlot.getState().set('full', el), []);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [sheet, setSheet] = useState<'sleep' | 'more' | 'eq' | null>(null);
  const [sleep, setSleep] = useState<{ end: number | null; trackId: string | null } | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const tid = track?.id;

  // Timer tidur: jeda musik setelah N menit, atau begitu lagu berganti ("setelah lagu ini").
  const stopNow = useCallback(() => {
    const s = usePlayer.getState();
    if (s.status === 'playing' || s.status === 'loading') s.toggle();
    setSleep(null);
    toast('Timer tidur: musik dijeda');
  }, []);
  useEffect(() => {
    if (!sleep?.end) return;
    const t = setTimeout(stopNow, Math.max(0, sleep.end - Date.now()));
    return () => clearTimeout(t);
  }, [sleep, stopNow]);
  useEffect(() => {
    if (sleep?.trackId && tid && tid !== sleep.trackId) stopNow();
  }, [tid, sleep, stopNow]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || usePlayer.getState().queueOpen) return;
      if (sheet) setSheet(null);
      else if (lyricsOpen) setLyricsOpen(false);
      else usePlayer.getState().setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded, lyricsOpen, sheet]);

  if (!expanded || !track) return null;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const isYT = track.source === 'youtube';
  const playing = status === 'playing';
  const PlayIcon = status === 'loading' ? Loader2 : playing ? Pause : Play;
  const playLabel = playing ? 'Jeda' : status === 'loading' ? 'Memuat' : 'Putar';
  const sub = [track.artist, track.album].filter(Boolean).join(' · ');

  const share = async () => {
    if (!isYT || !track.videoId) return toast('Lagu dari berkas lokal tidak bisa dibagikan', 'err');
    const url = `https://www.youtube.com/watch?v=${track.videoId}`;
    try {
      if (navigator.share) await navigator.share({ title: track.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Tautan disalin');
      }
    } catch {
      /* dibatalkan pengguna */
    }
  };

  // Gestur: geser ke atas = buka lirik; geser ke bawah = tutup lirik / tutup pemutar.
  const onTouchStart = (e: TouchEvent) => {
    const t = e.target as HTMLElement;
    touch.current = t.closest('input,button,[data-lyrics],[data-noswipe]') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dy) < 70 || Math.abs(dy) < Math.abs(dx) * 1.5) return;
    if (dy < 0 && !lyricsOpen) setLyricsOpen(true);
    else if (dy > 0) {
      if (lyricsOpen) setLyricsOpen(false);
      else p().setExpanded(false);
    }
  };

  const heartBtn = (cls: string) => (
    <button onClick={() => useLibrary.getState().toggleFavorite(track)} aria-label={fav ? 'Hapus dari favorit' : 'Tambah ke favorit'} aria-pressed={fav} className={`press flex h-14 w-14 shrink-0 items-center justify-center bg-tone-on text-tone-bg ${cls}`}>
      <Heart size={24} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Sedang diputar"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[60] animate-sheet overflow-hidden bg-tone-bg text-tone-on"
    >
      {/* Latar tonal dari warna sampul; gradien ringan saja (tanpa filter blur berat) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          key={track.id}
          className="absolute inset-0 animate-fade"
          style={{ background: 'radial-gradient(110% 45% at 50% -5%, rgb(var(--cover) / 0.22), transparent 70%), radial-gradient(70% 35% at 100% 100%, rgb(var(--cover2) / 0.12), transparent 70%)' }}
        />
      </div>

      <div className="relative mx-auto flex h-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <div className="relative flex min-h-[64px] flex-col items-center justify-center text-center">
          <button onClick={() => p().setExpanded(false)} aria-label="Tutup pemutar" className="press absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-tone-mute">
            <ChevronDown size={26} aria-hidden="true" />
          </button>
          <span className="text-[22px] font-medium leading-tight">{lyricsOpen ? 'Lirik' : 'Sedang Diputar'}</span>
          <span className="text-base text-tone-mute">Antrean · {index + 1} dari {total}</span>
        </div>

        {/* Sampul. Satu slot yang sama dipakai di kedua mode agar iframe YouTube tetap terlihat penuh. */}
        <div className={lyricsOpen ? 'mt-2 flex items-center gap-3' : 'flex flex-1 flex-col justify-center gap-4 py-3'}>
          {isYT ? (
            <div
              ref={slotRef}
              className={`overflow-hidden bg-tone-card ${playing ? 'animate-glow' : 'shadow-[0_0_50px_-8px_rgb(var(--cover)/0.3)]'} ${
                lyricsOpen ? 'aspect-video w-32 shrink-0 rounded-xl' : 'aspect-video min-h-[200px] w-full rounded-2xl'
              }`}
            >
              <Artwork track={track} size={448} className="!h-full !w-full rounded-none" />
            </div>
          ) : (
            <div className={lyricsOpen ? 'shrink-0' : 'mx-auto w-full max-w-[340px]'}>
              <div
                className={`relative flex aspect-square items-center justify-center overflow-hidden text-tone-bg/80 ${playing ? 'animate-glow' : ''} ${lyricsOpen ? 'w-16 rounded-xl' : 'w-full rounded-2xl'}`}
                style={{ background: 'linear-gradient(145deg, rgb(var(--cover)), rgb(var(--cover2)))', boxShadow: '0 0 60px -10px rgb(var(--cover) / 0.5)' }}
              >
                <Music2 size={lyricsOpen ? 26 : 96} aria-hidden="true" />
              </div>
            </div>
          )}
          {!isYT && !lyricsOpen && <Visualizer />}

          {/* Judul + bagikan/favorit */}
          <div className={`flex min-w-0 items-center gap-3 ${lyricsOpen ? 'flex-1' : 'animate-rise mt-2'}`}>
            <div className="min-w-0 flex-1">
              <h2 className={`font-bold leading-tight tracking-tight ${lyricsOpen ? 'line-clamp-2 text-base' : 'line-clamp-2 text-[28px]'}`}>{track.title}</h2>
              <p className={`mt-1 truncate font-semibold text-tone-on/90 ${lyricsOpen ? 'text-sm' : 'text-xl'}`}>{sub}</p>
            </div>
            {lyricsOpen ? (
              heartBtn('h-11 w-11 rounded-full')
            ) : (
              <div className="flex shrink-0 gap-[3px]">
                <button onClick={() => void share()} aria-label="Bagikan lagu" className="press flex h-14 w-14 items-center justify-center rounded-l-full rounded-r-lg bg-tone-on text-tone-bg">
                  <Share2 size={22} aria-hidden="true" />
                </button>
                {heartBtn('rounded-l-lg rounded-r-full')}
              </div>
            )}
          </div>
        </div>

        {lyricsOpen && <LyricsPanel onClose={() => setLyricsOpen(false)} />}

        {status === 'error' && error && (
          <div role="alert" className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-red-400/40 bg-tone-card p-3 text-sm">
            <span className="text-red-300">{error}</span>
            <button onClick={() => p().retry()} className="press flex shrink-0 items-center gap-1.5 rounded-full bg-tone-bg px-3 py-1.5 font-medium">
              <RefreshCw size={14} aria-hidden="true" /> Ulangi
            </button>
          </div>
        )}

        <div className="mt-3">
          <SeekBar />
        </div>

        {/* Kontrol utama */}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => p().prev()} aria-label="Lagu sebelumnya" className="press flex h-14 w-[64px] shrink-0 items-center justify-center rounded-[28px_12px_12px_28px] bg-tone-card">
            <SkipBack size={26} fill="currentColor" aria-hidden="true" />
          </button>
          <button
            onClick={() => p().toggle()}
            aria-label={playing ? 'Jeda' : status === 'loading' ? 'Memuat, tekan untuk menjeda' : 'Putar'}
            className="press flex h-14 min-w-0 flex-1 items-center justify-center gap-3 rounded-full bg-tone-on text-lg font-semibold text-tone-bg active:scale-95"
          >
            <PlayIcon size={26} fill={status === 'loading' ? 'none' : 'currentColor'} className={status === 'loading' ? 'animate-spin' : ''} aria-hidden="true" />
            {playLabel}
          </button>
          <button onClick={() => p().next()} aria-label="Lagu berikutnya" className="press flex h-14 w-[64px] shrink-0 items-center justify-center rounded-[12px_28px_28px_12px] bg-tone-card">
            <SkipForward size={26} fill="currentColor" aria-hidden="true" />
          </button>
        </div>

        {/* Baris bawah: antrean · timer tidur · acak · lirik · ulang   |   lainnya */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            <button onClick={() => p().setQueueOpen(true)} aria-label="Buka antrean" className={`${seg} rounded-l-full rounded-r-lg`}>
              <ListMusic size={22} aria-hidden="true" />
            </button>
            <button onClick={() => setSheet('sleep')} aria-label={sleep ? 'Timer tidur aktif' : 'Timer tidur'} aria-pressed={!!sleep} className={`${seg} rounded-lg ${sleep ? segOn : ''}`}>
              <Moon size={22} aria-hidden="true" />
            </button>
            <button onClick={() => p().toggleShuffle()} aria-label="Acak" aria-pressed={shuffle} className={`${seg} rounded-lg ${shuffle ? segOn : ''}`}>
              <Shuffle size={22} aria-hidden="true" />
            </button>
            <button onClick={() => setLyricsOpen((v) => !v)} aria-label={lyricsOpen ? 'Sembunyikan lirik' : 'Tampilkan lirik'} aria-pressed={lyricsOpen} className={`${seg} rounded-lg ${lyricsOpen ? segOn : ''}`}>
              <AlignCenter size={22} aria-hidden="true" />
            </button>
            <button
              onClick={() => p().cycleRepeat()}
              aria-label={repeat === 'off' ? 'Ulangi: mati' : repeat === 'all' ? 'Ulangi: semua' : 'Ulangi: satu lagu'}
              aria-pressed={repeat !== 'off'}
              className={`${seg} rounded-l-lg rounded-r-full ${repeat !== 'off' ? segOn : ''}`}
            >
              <RepeatIcon size={22} aria-hidden="true" />
            </button>
          </div>
          <button onClick={() => setSheet('more')} aria-label="Opsi lainnya" className="press flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tone-on text-tone-bg">
            <MoreVertical size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      {sheet && (
        <div className="absolute inset-0 z-10 flex animate-fade items-end bg-black/60" onClick={() => setSheet(null)}>
          <div data-noswipe onClick={(e) => e.stopPropagation()} className="mx-auto max-h-[88dvh] w-full max-w-md animate-sheet overflow-y-auto rounded-t-3xl bg-tone-card p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            {sheet === 'eq' ? (
              <EqualizerPanel isLocal={!isYT} />
            ) : sheet === 'sleep' ? (
              <>
                <h3 className="mb-1 text-lg font-semibold">Timer tidur</h3>
                <p className="mb-3 text-sm text-tone-mute">
                  {sleep ? (sleep.end ? `Musik dijeda pukul ${new Date(sleep.end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.` : 'Musik dijeda setelah lagu ini.') : 'Jeda musik otomatis setelah waktu yang dipilih.'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SLEEP_MIN.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSleep({ end: Date.now() + m * 60_000, trackId: null });
                        setSheet(null);
                        toast(`Timer tidur ${m} menit aktif`);
                      }}
                      className="press h-12 rounded-xl bg-tone-bg font-medium"
                    >
                      {m} menit
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSleep({ end: null, trackId: track.id });
                      setSheet(null);
                      toast('Musik dijeda setelah lagu ini');
                    }}
                    className="press col-span-2 h-12 rounded-xl bg-tone-bg font-medium"
                  >
                    Setelah lagu ini
                  </button>
                  {sleep && (
                    <button
                      onClick={() => {
                        setSleep(null);
                        setSheet(null);
                        toast('Timer tidur dimatikan');
                      }}
                      className="press col-span-2 h-12 rounded-xl border border-tone-on/30 font-medium"
                    >
                      Matikan timer
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-semibold">Opsi</h3>
                <VolumeControl className="mb-3" />
                <div className="grid gap-2">
                  <button onClick={() => setSheet('eq')} className="press h-12 rounded-xl bg-tone-bg font-medium">
                    Equalizer
                  </button>
                  <button
                    onClick={() => {
                      setSheet(null);
                      useUI.getState().openAddTo(track);
                    }}
                    className="press h-12 rounded-xl bg-tone-bg font-medium"
                  >
                    Tambah ke playlist
                  </button>
                  <button
                    onClick={() => {
                      setSheet(null);
                      useUI.getState().openMenu(track);
                    }}
                    className="press h-12 rounded-xl bg-tone-bg font-medium"
                  >
                    Menu lagu lainnya
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
