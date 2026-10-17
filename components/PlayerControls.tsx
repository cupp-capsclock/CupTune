'use client';
import { Loader2, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { fmtTime } from '@/lib/format';
import { usePlayer } from '@/stores/player';
import { useProgress } from '@/stores/progress';

export function PlayPauseButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const status = usePlayer((s) => s.status);
  const toggle = usePlayer((s) => s.toggle);
  const Icon = status === 'loading' ? Loader2 : status === 'playing' ? Pause : Play;
  const label = status === 'playing' ? 'Jeda' : status === 'loading' ? 'Memuat, tekan untuk menjeda' : 'Putar';
  const cls = size === 'lg'
    ? 'h-[72px] w-[72px] bg-accent text-accent-fg shadow-[0_0_36px_rgb(var(--accent)/0.55)] active:scale-90'
    : size === 'md' ? 'h-11 w-11 bg-accent text-accent-fg' : 'h-10 w-10';
  const px = size === 'lg' ? 32 : 22;
  return (
    <button onClick={toggle} aria-label={label} className={`press flex shrink-0 items-center justify-center rounded-full transition-all duration-150 ${cls}`}>
      <Icon size={px} className={status === 'loading' ? 'animate-spin' : ''} fill={status === 'loading' ? 'none' : 'currentColor'} aria-hidden="true" />
    </button>
  );
}

export function ProgressLine() {
  const pos = useProgress((s) => s.position);
  const dur = useProgress((s) => s.duration);
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;
  return (
    <div className="absolute inset-x-3 top-0 h-0.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
      <div className="h-full bg-accent shadow-[0_0_8px_rgb(var(--accent))]" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SeekBar() {
  const pos = useProgress((s) => s.position);
  const dur = useProgress((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const [drag, setDrag] = useState<number | null>(null);
  const dragging = useRef(false);
  const value = drag ?? pos;
  const pct = dur > 0 ? Math.min(100, Math.max(0, (value / dur) * 100)) : 0;
  const commit = (v: number) => {
    dragging.current = false;
    setDrag(null);
    seek(v);
  };
  return (
    <div>
      <div className="relative h-11">
        {/* bagian terputar */}
        <div className="absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-full bg-tone-on" style={{ width: `max(16px, calc(${pct}% - 6px))` }} />
        {/* garis penunjuk */}
        <div className="absolute top-1/2 h-11 w-1 -translate-y-1/2 rounded-full bg-tone-on" style={{ left: `calc(${pct}% * 0.985)` }} />
        {/* sisa */}
        <div className="absolute right-0 top-1/2 h-4 -translate-y-1/2 rounded-full bg-tone-on/15" style={{ left: `calc(${pct}% * 0.985 + 8px)` }}>
          <span className="absolute right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-tone-on/70" />
        </div>
        <input
          type="range"
          min={0}
          max={dur > 0 ? Math.floor(dur) : 1}
          step={1}
          value={Math.min(value, dur > 0 ? dur : 1)}
          disabled={dur <= 0}
          aria-label="Posisi lagu"
          aria-valuetext={`${fmtTime(value)} dari ${fmtTime(dur)}`}
          onPointerDown={() => (dragging.current = true)}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (dragging.current) setDrag(v);
            else seek(v);
          }}
          onPointerUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
          onPointerCancel={() => commit(pos)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
        />
      </div>
      <div className="flex justify-between px-1 text-sm font-medium tabular-nums text-tone-on/85">
        <span>{fmtTime(value)}</span>
        <span>{dur > 0 ? fmtTime(dur) : '--:--'}</span>
      </div>
    </div>
  );
}

export function VolumeControl({ className = '' }: { className?: string }) {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const Icon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button onClick={toggleMute} aria-label={muted ? 'Aktifkan suara' : 'Bisukan'} aria-pressed={muted} className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <Icon size={20} aria-hidden="true" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={muted ? 0 : volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volume"
        style={{ '--p': `${muted ? 0 : volume}%` } as CSSProperties}
        className="range min-w-0"
      />
    </div>
  );
}
