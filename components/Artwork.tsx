'use client';
import { Music2 } from 'lucide-react';
import { useState } from 'react';
import { thumbOf } from '@/lib/tracks';
import type { Track } from '@/lib/types';
import { useSettings } from '@/stores/settings';

export default function Artwork({ track, size = 48, high = false, className = '' }: { track: Track; size?: number; high?: boolean; className?: string }) {
  const q = useSettings((s) => s.thumbQ);
  const [bad, setBad] = useState(false);
  const src = thumbOf(track, high ? 'high' : q);
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-lg bg-surface2 ${className}`} style={{ width: size, height: size }}>
      {src && !bad ? (
        <img src={src} alt={`Sampul ${track.title}`} loading="lazy" decoding="async" onError={() => setBad(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted">
          <Music2 size={Math.round(size * 0.4)} aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
