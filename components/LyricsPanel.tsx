'use client';
import { Loader2, Minus, Plus, RotateCcw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientApiError } from '@/lib/api';
import { activeIndex, bestMatch, clearChoice, guessQuery, loadSaved, saveChoice, searchCandidates, toLyrics } from '@/lib/lyrics';
import type { Candidate, Lyrics } from '@/lib/lyrics';
import { fmtTime } from '@/lib/format';
import { usePlayer } from '@/stores/player';
import { useProgress } from '@/stores/progress';

type State =
  | { k: 'loading' }
  | { k: 'ok'; lyrics: Lyrics }
  | { k: 'none'; cands: Candidate[] }
  | { k: 'error'; msg: string };

export default function LyricsPanel({ onClose }: { onClose: () => void }) {
  const track = usePlayer((s) => s.queue[s.index]);
  const [st, setSt] = useState<State>({ k: 'loading' });
  const [searching, setSearching] = useState(false);
  const [offset, setOffset] = useState(0); // detik; + = lirik lebih cepat
  const box = useRef<HTMLDivElement>(null);
  const lineEls = useRef<(HTMLButtonElement | null)[]>([]);
  const pauseAuto = useRef(0);
  const touchY = useRef<{ y: number; top: number } | null>(null);

  const lines = st.k === 'ok' ? st.lyrics.synced : null;
  const idx = useProgress((s) => (lines ? activeIndex(lines, s.position + 0.25 + offset) : -1));

  // Muat lirik saat lagu berganti: pilihan tersimpan → pencarian otomatis (hanya jika cocok yakin).
  const tid = track?.id;
  useEffect(() => {
    if (!track) return;
    let off = false;
    setOffset(0);
    setSearching(false);
    lineEls.current = [];
    const saved = loadSaved(track.id);
    if (saved) {
      setSt({ k: 'ok', lyrics: toLyrics(saved) });
      return;
    }
    setSt({ k: 'loading' });
    const q = guessQuery(track);
    searchCandidates({ title: q.title, artist: q.artist })
      .then((cands) => {
        if (off) return;
        const m = bestMatch(cands, q.title, track.durationSec);
        setSt(m ? { k: 'ok', lyrics: toLyrics(m) } : { k: 'none', cands });
      })
      .catch((e) => !off && setSt({ k: 'error', msg: e instanceof ClientApiError ? e.message : 'Gagal memuat lirik.' }));
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid]);

  // Auto-scroll ke baris aktif (berhenti 3,5 dtk setelah pengguna menggulir sendiri).
  useEffect(() => {
    if (idx < 0 || Date.now() < pauseAuto.current) return;
    const c = box.current, el = lineEls.current[idx];
    if (!c || !el) return;
    c.scrollTo({ top: el.offsetTop - c.clientHeight * 0.38 + el.clientHeight / 2, behavior: 'smooth' });
  }, [idx]);

  const choose = useCallback(
    (c: Candidate) => {
      if (!track) return;
      saveChoice(track.id, c);
      setSt({ k: 'ok', lyrics: toLyrics(c) });
      setSearching(false);
    },
    [track],
  );

  if (!track) return null;

  const bump = () => (pauseAuto.current = Date.now() + 3500);

  return (
    <div data-lyrics className="relative flex min-h-0 flex-1 flex-col">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">
          {st.k === 'ok' ? (lines ? 'Lirik sinkron' : 'Lirik biasa (tanpa sinkronisasi)') : 'Lirik'} · sumber LRCLIB
        </span>
        <span className="flex items-center gap-1">
          {lines && (
            <span className="flex items-center rounded-full bg-white/10 px-1" role="group" aria-label="Geser sinkronisasi lirik">
              <button onClick={() => setOffset((o) => Math.round((o - 0.5) * 10) / 10)} aria-label="Lirik lebih lambat 0,5 detik" className="press flex h-8 w-8 items-center justify-center"><Minus size={14} aria-hidden="true" /></button>
              <span className="w-10 text-center tabular-nums">{offset > 0 ? '+' : ''}{offset.toFixed(1)}s</span>
              <button onClick={() => setOffset((o) => Math.round((o + 0.5) * 10) / 10)} aria-label="Lirik lebih cepat 0,5 detik" className="press flex h-8 w-8 items-center justify-center"><Plus size={14} aria-hidden="true" /></button>
            </span>
          )}
          <button onClick={() => setSearching((v) => !v)} aria-label="Cari lirik lain" aria-pressed={searching} className={`press flex h-9 w-9 items-center justify-center rounded-full ${searching ? 'bg-accent text-accent-fg' : 'bg-white/10'}`}>
            <Search size={16} aria-hidden="true" />
          </button>
        </span>
      </div>

      {searching ? (
        <SearchBox
          key={track.id}
          initial={guessQuery(track)}
          onPick={choose}
          onReset={() => {
            clearChoice(track.id);
            setSearching(false);
            setSt({ k: 'loading' });
            const q = guessQuery(track);
            searchCandidates({ title: q.title, artist: q.artist })
              .then((c) => {
                const m = bestMatch(c, q.title, track.durationSec);
                setSt(m ? { k: 'ok', lyrics: toLyrics(m) } : { k: 'none', cands: c });
              })
              .catch(() => setSt({ k: 'error', msg: 'Gagal memuat lirik.' }));
          }}
          onClose={() => setSearching(false)}
        />
      ) : st.k === 'loading' ? (
        <div className="flex flex-1 items-center justify-center text-muted" role="status">
          <Loader2 className="animate-spin" size={22} aria-label="Memuat lirik" />
        </div>
      ) : st.k === 'error' ? (
        <Empty title="Lirik tidak dapat dimuat" text={st.msg} action="Cari manual" onAction={() => setSearching(true)} />
      ) : st.k === 'none' ? (
        <Empty
          title="Lirik belum tersedia"
          text={st.cands.length ? 'Tidak ada hasil yang cukup cocok dengan lagu ini, jadi tidak ditampilkan agar tidak salah. Kamu bisa memilih sendiri.' : 'Belum ada lirik untuk lagu ini di LRCLIB.'}
          action="Cari lirik"
          onAction={() => setSearching(true)}
        />
      ) : lines ? (
        <div
          ref={box}
          onTouchStart={(e) => {
            bump();
            touchY.current = { y: e.touches[0].clientY, top: box.current?.scrollTop ?? 0 };
          }}
          onTouchMove={bump}
          onWheel={bump}
          onTouchEnd={(e) => {
            const s = touchY.current;
            touchY.current = null;
            if (s && s.top <= 0 && (box.current?.scrollTop ?? 0) <= 0 && e.changedTouches[0].clientY - s.y > 90) onClose(); // tarik ke bawah dari atas = tutup lirik
          }}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth py-[30%] [mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_82%,transparent)]"
        >
          {lines.map((l, i) => {
            const d = Math.abs(i - idx);
            return (
              <button
                key={i}
                ref={(el) => {
                  lineEls.current[i] = el;
                }}
                onClick={() => usePlayer.getState().seek(Math.max(0, l.t - offset))}
                aria-label={`Loncat ke ${fmtTime(l.t)}`}
                aria-current={i === idx ? 'true' : undefined}
                className={`block w-full origin-left px-1 py-2 text-left text-[26px] font-bold leading-tight tracking-tight transition-[opacity,transform,filter] duration-300 ease-out ${
                  i === idx ? 'scale-100 opacity-100' : d === 1 ? 'scale-[0.94] opacity-50' : d === 2 ? 'scale-[0.92] opacity-30' : 'scale-[0.9] opacity-[0.18]'
                }`}
                style={i === idx ? { textShadow: '0 0 24px rgb(var(--cover) / 0.55)' } : undefined}
              >
                {l.text || '♪'}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          ref={box}
          onTouchStart={(e) => (touchY.current = { y: e.touches[0].clientY, top: box.current?.scrollTop ?? 0 })}
          onTouchEnd={(e) => {
            const s = touchY.current;
            touchY.current = null;
            if (s && s.top <= 0 && (box.current?.scrollTop ?? 0) <= 0 && e.changedTouches[0].clientY - s.y > 90) onClose();
          }}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-pre-wrap py-4 text-lg font-semibold leading-relaxed text-fg/80"
        >
          {st.k === 'ok' && st.lyrics.plain}
        </div>
      )}
      {st.k === 'ok' && !searching && (
        <p className="mt-1 truncate text-center text-[11px] text-muted">
          {st.lyrics.title} — {st.lyrics.artist}
        </p>
      )}
    </div>
  );
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm text-muted">{text}</p>
      <button onClick={onAction} className="press rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg">{action}</button>
    </div>
  );
}

function SearchBox({ initial, onPick, onReset, onClose }: { initial: { title: string; artist: string }; onPick: (c: Candidate) => void; onReset: () => void; onClose: () => void }) {
  const [q, setQ] = useState(`${initial.artist} ${initial.title}`.trim());
  const [res, setRes] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setErr('');
    try {
      setRes(await searchCandidates({ q: query }));
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Pencarian gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-noswipe>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run()}
          placeholder="Judul atau artis"
          aria-label="Cari lirik"
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-white/10 px-4 text-sm outline-none focus:border-accent"
        />
        <button onClick={() => void run()} disabled={busy} className="press h-11 shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50">
          {busy ? '…' : 'Cari'}
        </button>
        <button onClick={onClose} aria-label="Tutup pencarian lirik" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      <ul className="no-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {res?.length === 0 && <li className="py-6 text-center text-sm text-muted">Tidak ada hasil.</li>}
        {res?.map((c) => (
          <li key={c.id}>
            <button onClick={() => onPick(c)} className="press flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-left">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.title}</span>
                <span className="block truncate text-xs text-muted">{c.artist}{c.duration ? ` · ${fmtTime(c.duration)}` : ''}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.synced ? 'bg-accent text-accent-fg' : 'bg-white/10 text-muted'}`}>{c.synced ? 'Sinkron' : 'Biasa'}</span>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onReset} className="press flex items-center justify-center gap-2 py-1 text-xs text-muted">
        <RotateCcw size={13} aria-hidden="true" /> Atur ulang ke pencarian otomatis
      </button>
    </div>
  );
}
