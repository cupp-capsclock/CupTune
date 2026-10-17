'use client';
import { useEffect, useState } from 'react';
import { apiCacheSize, clearApiCache, useApi } from '@/lib/api';
import { storageEstimate } from '@/lib/db';
import { fmtBytes } from '@/lib/format';
import { confirmDialog } from '@/stores/dialogs';
import { useLibrary } from '@/stores/library';
import { useSearches } from '@/stores/searches';
import { useSettings } from '@/stores/settings';
import type { Accent, Motion, ThumbPref, Theme } from '@/stores/settings';
import { toast } from '@/stores/toast';
import { LogoMark } from './Logo';

const APP_VERSION = '1.0.0';

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="py-3">
      <p className="mb-2 text-sm font-medium" id={`seg-${label}`}>{label}</p>
      <div role="radiogroup" aria-labelledby={`seg-${label}`} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={`press rounded-full border px-4 py-2 text-sm ${value === o.id ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'sky', label: 'Biru elektrik', color: '#4f8cff' },
  { id: 'violet', label: 'Ungu neon', color: '#b06aff' },
  { id: 'mint', label: 'Mint', color: '#5eeab4' },
  { id: 'rose', label: 'Merah muda', color: '#fb7185' },
  { id: 'amber', label: 'Kuning', color: '#fbbf24' },
];

export default function SettingsView() {
  const s = useSettings();
  const lib = useLibrary();
  const searches = useSearches();
  const status = useApi<{ configured: boolean }>('/api/youtube/status');
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const [cacheN, setCacheN] = useState(0);

  useEffect(() => {
    void storageEstimate().then(setEst);
    setCacheN(apiCacheSize());
  }, []);

  const section = 'mt-6 rounded-2xl border border-line bg-surface px-4';
  const row = 'flex w-full items-center justify-between gap-3 py-3.5 text-left text-sm';

  return (
    <div className="pt-2">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Pengaturan</h1>

      <section aria-label="Tampilan" className={section}>
        <Segmented<Theme> label="Tema" value={s.theme} onChange={(v) => s.update({ theme: v })} options={[{ id: 'dark', label: 'Gelap' }, { id: 'light', label: 'Terang' }]} />
        <div className="border-t border-line py-3">
          <p className="mb-2 text-sm font-medium" id="accent-label">Warna aksen</p>
          <div role="radiogroup" aria-labelledby="accent-label" className="flex gap-3">
            {ACCENTS.map((a) => (
              <button key={a.id} role="radio" aria-checked={s.accent === a.id} aria-label={a.label} onClick={() => s.update({ accent: a.id })} className={`press h-10 w-10 rounded-full border-2 ${s.accent === a.id ? 'border-fg' : 'border-transparent'}`} style={{ background: a.color }} />
            ))}
          </div>
        </div>
        <div className="border-t border-line">
          <Segmented<ThumbPref> label="Kualitas gambar sampul" value={s.thumbPref} onChange={(v) => s.update({ thumbPref: v })} options={[{ id: 'auto', label: 'Otomatis' }, { id: 'low', label: 'Hemat data' }, { id: 'high', label: 'Tajam' }]} />
        </div>
        <div className="border-t border-line">
          <Segmented<Motion> label="Animasi" value={s.motion} onChange={(v) => s.update({ motion: v })} options={[{ id: 'system', label: 'Ikuti sistem' }, { id: 'on', label: 'Aktif' }, { id: 'off', label: 'Mati' }]} />
        </div>
      </section>

      <section aria-label="Pemutaran" className={section}>
        <button role="switch" aria-checked={s.keepAwake} onClick={() => s.update({ keepAwake: !s.keepAwake })} className={`${row} press`}>
          <span>
            Jaga layar tetap menyala saat memutar
            <span className="block text-xs text-muted">Mencegah layar mati otomatis agar musik YouTube tidak terjeda. Lebih boros baterai.</span>
          </span>
          <span aria-hidden className={`relative h-6 w-11 shrink-0 rounded-full border border-line transition-colors ${s.keepAwake ? 'bg-accent' : 'bg-surface'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-fg transition-all ${s.keepAwake ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </section>

      <section aria-label="Data lokal" className={`${section} divide-y divide-line`}>
        <button
          className={row}
          onClick={async () => {
            if (await confirmDialog({ title: 'Hapus riwayat pencarian?', confirmLabel: 'Hapus', danger: true })) {
              searches.clear();
              toast('Riwayat pencarian dihapus');
            }
          }}
        >
          <span>Hapus riwayat pencarian<span className="block text-xs text-muted">{searches.items.length} pencarian tersimpan</span></span>
        </button>
        <button
          className={row}
          onClick={async () => {
            if (await confirmDialog({ title: 'Hapus riwayat pemutaran?', confirmLabel: 'Hapus', danger: true })) {
              lib.clearRecents();
              toast('Riwayat pemutaran dihapus');
            }
          }}
        >
          <span>Hapus riwayat pemutaran<span className="block text-xs text-muted">{lib.recents.length} lagu tercatat</span></span>
        </button>
        <button
          className={row}
          onClick={() => {
            const n = clearApiCache();
            setCacheN(0);
            toast(n ? `${n} entri cache dihapus` : 'Cache sudah kosong');
          }}
        >
          <span>Hapus cache metadata<span className="block text-xs text-muted">{cacheN} entri di memori sesi ini</span></span>
        </button>
      </section>

      <section aria-label="Pintasan keyboard" className={`${section} py-3 text-sm`}>
        <h2 className="mb-2 font-medium">Pintasan keyboard (desktop)</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted">
          <dt className="font-mono text-fg">Spasi</dt><dd>Putar / jeda</dd>
          <dt className="font-mono text-fg">← / →</dt><dd>Mundur / maju 5 detik</dd>
          <dt className="font-mono text-fg">Shift + ← / →</dt><dd>Lagu sebelumnya / berikutnya</dd>
          <dt className="font-mono text-fg">M · S · R</dt><dd>Bisu · acak · ulangi</dd>
          <dt className="font-mono text-fg">Esc</dt><dd>Tutup panel</dd>
        </dl>
      </section>

      <section aria-label="Privasi" className={`${section} py-3 text-sm`}>
        <h2 className="mb-2 font-medium">Privasi</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>CupTune tidak meminta akun. Pustaka, playlist, antrean, riwayat, dan berkas audio lokal disimpan hanya di browser perangkat ini.</li>
          <li>Kata kunci pencarian dikirim ke server aplikasi ini lalu diteruskan ke YouTube Data API. API key tersimpan di server dan tidak pernah dikirim ke browser.</li>
          <li>Saat memutar dari YouTube, pemutar resmi YouTube dimuat dari youtube.com dan tunduk pada kebijakan privasi Google/YouTube, termasuk cookie dan data penggunaan.</li>
          <li>Tidak ada sinkronisasi cloud. Menghapus data browser akan menghapus pustakamu.</li>
        </ul>
      </section>

      <section aria-label="Tentang" className={`${section} py-4 text-sm`}>
        <div className="mb-3 flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <h2 className="font-semibold">CupTune</h2>
            <p className="text-muted">Your Music, Your Vibe.</p>
          </div>
        </div>
        <p className="text-muted">CupTune is a lightweight music discovery and playback experience built by MkdirCup.</p>
        <p className="mt-2 text-muted">Pengembang: MkdirCup</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted">
          <dt>Versi</dt><dd className="text-fg">{APP_VERSION}</dd>
          <dt>API YouTube</dt><dd className="text-fg">{status.data ? (status.data.configured ? 'Terkonfigurasi di server' : 'Belum dikonfigurasi') : status.error ? 'Tidak dapat diperiksa' : 'Memeriksa…'}</dd>
          <dt>Penyimpanan lokal</dt><dd className="text-fg">{lib.storageOk ? 'Tersedia' : 'Tidak tersedia'}{est ? ` · ${fmtBytes(est.usage)} dari ${fmtBytes(est.quota)}` : ''}</dd>
          <dt>Media Session</dt><dd className="text-fg">{typeof navigator !== 'undefined' && 'mediaSession' in navigator ? 'Didukung browser' : 'Tidak didukung'}</dd>
          <dt>Koneksi</dt><dd className="text-fg">{typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline'}</dd>
          <dt>Pustaka</dt><dd className="text-fg">{lib.playlists.length} playlist · {lib.favorites.length} favorit · {lib.saved.length} tersimpan</dd>
        </dl>
      </section>
    </div>
  );
}
