'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { applyCoverVars, fallbackColor, sampleColor } from '@/lib/color';
import { engine } from '@/lib/player/engine';
import { hydratePlayer } from '@/lib/player/persist';
import { thumbOf } from '@/lib/tracks';
import { useLibrary } from '@/stores/library';
import { usePlayer } from '@/stores/player';
import { useProgress } from '@/stores/progress';
import { useEq } from '@/stores/eq';
import { useSettings } from '@/stores/settings';
import { useSlot } from '@/stores/slot';

/**
 * Menjalankan engine pemutar global (YouTube IFrame + audio lokal), menempatkan iframe YouTube
 * di slot yang terlihat, mengatur Media Session, riwayat putar, dan pintasan keyboard.
 */
export default function PlayerEngine() {
  const hostRef = useRef<HTMLDivElement>(null);
  const track = usePlayer((s) => s.queue[s.index]);
  const status = usePlayer((s) => s.status);
  const mini = useSlot((s) => s.mini);
  const full = useSlot((s) => s.full);
  const el = full ?? mini;
  const isYT = track?.source === 'youtube';

  useEffect(() => {
    if (hostRef.current) {
      engine.attach(hostRef.current);
      engine.bind();
    }
    void hydratePlayer();
    return () => engine.detach();
  }, []);

  // Tempatkan iframe tepat di atas slot yang aktif.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!el || !isYT) {
      host.style.visibility = 'hidden';
      return;
    }
    host.style.visibility = 'visible';
    host.style.pointerEvents = full ? 'auto' : 'none';
    const place = () => {
      const r = el.getBoundingClientRect();
      host.style.left = `${r.left}px`;
      host.style.top = `${r.top}px`;
      host.style.width = `${r.width}px`;
      host.style.height = `${r.height}px`;
      host.style.borderRadius = getComputedStyle(el).borderRadius;
    };
    place();
    const end = performance.now() + 600;
    let raf = requestAnimationFrame(function loop() {
      place();
      if (performance.now() < end) raf = requestAnimationFrame(loop);
    });
    const ro = new ResizeObserver(place);
    ro.observe(el);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [el, full, isYT, track?.id]);

  // Riwayat "Baru Diputar": dicatat saat lagu benar-benar mulai diputar.
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (status === 'playing' && track && recorded.current !== track.id) {
      recorded.current = track.id;
      useLibrary.getState().addRecent(track);
    }
  }, [status, track]);

  // Warna dominan sampul → --cover (latar dinamis, glow, mini player). Fallback: warna dari id lagu.
  useEffect(() => {
    if (!track) return;
    applyCoverVars(fallbackColor(track.id));
    const src = thumbOf(track, 'low');
    if (!src) return;
    let off = false;
    void sampleColor(src).then((c) => {
      if (!off && c) applyCoverVars(c);
    });
    return () => {
      off = true;
    };
  }, [track]);

  // Equalizer (audio lokal): kirim pengaturan ke engine; bangun graf Web Audio saat diperlukan.
  const eqOn = useEq((s) => s.enabled);
  const eqGains = useEq((s) => s.gains);
  useEffect(() => {
    engine.setEq(eqOn, eqGains);
  }, [eqOn, eqGains]);
  const isLocal = track?.source === 'local';
  useEffect(() => {
    if (eqOn && isLocal && status === 'playing') void engine.getAnalyser();
  }, [eqOn, isLocal, status]);

  // Wake Lock: layar tetap menyala selama musik diputar (opsional di Pengaturan).
  const keepAwake = useSettings((s) => s.keepAwake);
  useEffect(() => {
    if (!keepAwake || status !== 'playing' || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (cancelled || lock || document.visibilityState !== 'visible') return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) return void l.release().catch(() => {});
        lock = l;
        l.addEventListener('release', () => {
          if (lock === l) lock = null;
        });
      } catch {
        /* ditolak (mis. mode hemat daya) */
      }
    };
    const onVis = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => {});
      lock = null;
    };
  }, [keepAwake, status]);

  // Media Session (jika didukung browser).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !track) return;
    const art = thumbOf(track, 'low');
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: art ? [{ src: art, sizes: '320x180', type: 'image/jpeg' }] : [],
      });
    } catch {
      /* tidak didukung */
    }
  }, [track]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : status === 'idle' ? 'none' : 'paused';
  }, [status]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(a, h);
      } catch {
        /* aksi tidak didukung */
      }
    };
    const p = () => usePlayer.getState();
    set('play', () => p().status !== 'playing' && p().toggle());
    set('pause', () => (p().status === 'playing' || p().status === 'loading') && p().toggle());
    set('previoustrack', () => p().prev());
    set('nexttrack', () => p().next());
    set('seekbackward', () => p().seek(Math.max(0, useProgress.getState().position - 10)));
    set('seekforward', () => p().seek(useProgress.getState().position + 10));
    set('seekto', (d) => typeof d.seekTime === 'number' && p().seek(d.seekTime));
    return () => {
      (['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[]).forEach((a) => set(a, null));
    };
  }, []);

  // Pintasan keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const p = usePlayer.getState();
      if (p.index < 0) return;
      const pos = useProgress.getState().position;
      switch (e.key) {
        case ' ':
          if (tag === 'BUTTON' || tag === 'A') return;
          e.preventDefault();
          p.toggle();
          break;
        case 'ArrowRight':
          e.shiftKey ? p.next() : p.seek(pos + 5);
          break;
        case 'ArrowLeft':
          e.shiftKey ? p.prev() : p.seek(Math.max(0, pos - 5));
          break;
        case 'm':
        case 'M':
          p.toggleMute();
          break;
        case 's':
        case 'S':
          p.toggleShuffle();
          break;
        case 'r':
        case 'R':
          p.cycleRepeat();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      ref={hostRef}
      aria-label="Pemutar YouTube"
      className="fixed z-[70] overflow-hidden bg-black"
      style={{ left: 0, top: 0, width: 200, height: 112, visibility: 'hidden' }}
    />
  );
}
