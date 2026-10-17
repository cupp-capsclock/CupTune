'use client';
import { useEffect, useRef, useState } from 'react';
import { engine } from '@/lib/player/engine';
import { usePlayer } from '@/stores/player';

const BARS = 32;

/**
 * Visualizer nyata untuk audio lokal (AnalyserNode). Iframe YouTube tidak memberi data audio,
 * jadi untuk lagu YouTube komponen ini tidak dirender (tidak ada animasi palsu yang berpura-pura mengikuti musik).
 */
export default function Visualizer({ className = '' }: { className?: string }) {
  const status = usePlayer((s) => s.status);
  const ref = useRef<HTMLCanvasElement>(null);
  const [an, setAn] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (status !== 'playing' || an) return;
    let off = false;
    void engine.getAnalyser().then((a) => !off && a && setAn(a));
    return () => {
      off = true;
    };
  }, [status, an]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    ctx.scale(dpr, dpr);
    const data = new Uint8Array(an ? an.frequencyBinCount : BARS);
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--cover').trim().split(/\s+/).join(',') || '79,140,255';
    const gap = 3, bw = (w - gap * (BARS - 1)) / BARS;
    let raf = 0, last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return; // ±30 fps cukup & hemat baterai
      last = t;
      ctx.clearRect(0, 0, w, h);
      if (an && status === 'playing') an.getByteFrequencyData(data);
      else data.fill(0);
      for (let i = 0; i < BARS; i++) {
        const v = (data[Math.floor((i / BARS) * Math.min(data.length, 56))] ?? 0) / 255;
        const bh = Math.max(3, v * h);
        ctx.fillStyle = `rgba(${rgb},${0.35 + v * 0.65})`;
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), h - bh, bw, bh, 2);
        ctx.fill();
      }
      if (!an || status !== 'playing') {
        cancelAnimationFrame(raf); // gambar bar datar sekali saja
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [an, status]);

  return <canvas ref={ref} aria-hidden="true" className={`h-12 w-full ${className}`} />;
}
