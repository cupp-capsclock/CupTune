# CupTune — Your Music, Your Vibe.

Aplikasi penemuan dan pemutaran musik berbasis web (mobile-first, gelap, aksen biru muda) by **MkdirCup**.
Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · Zustand · Lucide.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local     # isi YOUTUBE_API_KEY
npm run dev                    # http://localhost:3000
npm run typecheck && npm run lint && npm run build
```

## Environment variable

| Nama | Wajib | Keterangan |
|---|---|---|
| `YOUTUBE_API_KEY` | ya, untuk konten YouTube | YouTube Data API v3. Boleh beberapa key dipisah koma; otomatis pindah key saat kuota habis. **Server-only** — jangan pakai prefix `NEXT_PUBLIC_`. |

Tanpa key, aplikasi tetap berjalan: Beranda menampilkan pemberitahuan dan audio lokal dari perangkat tetap bisa diputar.

> Jika key lama pernah dipublikasikan di GitHub, **revoke** lalu buat key baru di Google Cloud Console dan batasi ke YouTube Data API v3.

## Arsitektur

```
app/api/youtube/{search,chart,playlist,status}   proxy server → YouTube Data API v3 (key tidak keluar ke browser)
lib/server/        klien YouTube (timeout 8 dtk, validasi respons, cache TTL, rotasi key), rate limit 90 req/menit/IP
lib/player/engine  satu engine global: YouTube IFrame Player + <audio> untuk berkas lokal
stores/            player, progress (terpisah agar bar progres tidak me-render ulang UI), library (IndexedDB), settings, dll.
components/        UI; app/ halaman: Beranda, Cari, Pustaka, Playlist, Playlist YouTube (/yt/[id]), Pengaturan
```

Penyimpanan: IndexedDB (pustaka, playlist, antrean, riwayat, berkas audio lokal), localStorage hanya untuk preferensi dan riwayat pencarian. Tidak ada cloud sync.

## Kuota YouTube API (penting)

`search.list` = 100 unit; `videos.list`/`playlists.list`/`playlistItems.list` = 1 unit. Kuota default 10.000 unit/hari ≈ 100 pencarian.
Mitigasi: section Beranda baru memuat saat terlihat di layar, "Hits/Populer/Pilihan Cepat" memakai chart `mostPopular` (1 unit), cache server (30 mnt–6 jam) dan cache browser.

## Batasan provider (jujur)

- Playback YouTube memakai **IFrame Player resmi**. Tidak ada ekstraksi/unduh stream (library Python di repo asal memakai yt-dlp; itu **tidak** dipakai).
- Iframe harus terlihat. Di mode mini-player ukurannya kecil (48 px); di pemutar penuh 16:9 selebar layar (≥200 px tinggi pada layar ≥356 px). Mini-player di bawah ukuran minimum 200×200 yang disarankan YouTube — pertimbangkan sebelum rilis publik.
- Pemutaran latar belakang/lock screen untuk YouTube **tidak dijamin**: browser mobile umumnya menjeda iframe saat layar mati. Mitigasi yang dipasang: Wake Lock (layar tetap menyala saat memutar, bisa dimatikan di Pengaturan), Media Session (kontrol lockscreen + posisi), dan percobaan lanjut otomatis (maks. 3×) jika sistem menjeda saat layar mati. Hasilnya bergantung browser; PWA (Add to Home Screen) membantu tampilan, bukan jaminan background play.
- Visualizer hanya nyata untuk **audio lokal** (AnalyserNode). Iframe YouTube lintas-origin tidak memberi data audio, jadi untuk lagu YouTube tidak ada visualizer; yang ada hanya glow sampul yang berdenyut (dekoratif, tidak mengikuti musik).
- Volume iframe tidak berpengaruh di iOS (gunakan tombol perangkat).
- Video yang tidak boleh di-embed difilter; yang tetap gagal menampilkan pesan dan otomatis melompat ke lagu berikutnya (maks. 2 kali berturut-turut).
- Audio lokal (MP3/M4A/dll.) disimpan di IndexedDB dan memakai kontrol penuh; metadata hanya dari nama berkas.

## Lirik

- Sumber: **LRCLIB** (lrclib.net), database lirik komunitas terbuka dengan API publik tanpa kunci, diakses lewat proxy server `app/api/lyrics`.
- Lirik sinkron hanya ditampilkan jika data berisi timestamp LRC. Jika tidak ada, tampil lirik biasa (berlabel tanpa sinkronisasi) atau pesan "Lirik belum tersedia". Lirik tidak pernah dibuat/ditebak.
- Pencocokan otomatis ketat (judul cocok + selisih durasi ≤ 5 dtk); jika ragu, tidak ditampilkan dan pengguna bisa memilih manual lewat tombol cari. Pilihan disimpan di localStorage (maks. 40 lagu).
- Judul YouTube dibersihkan ("Official Video", "[Lyrics]", format "Artis - Judul"). Tombol ±0,5 dtk menggeser sinkronisasi bila video punya intro berbeda.
- Catatan lisensi: lirik tetap berhak cipta. LRCLIB adalah sumber komunitas, bukan penyedia berlisensi (seperti Musixmatch). Pertimbangkan penyedia berlisensi sebelum rilis publik/komersial.

## Metadata audio lokal

Judul/artis/album dibaca dari tag ID3v2.3/2.4 (MP3). Format lain (M4A, FLAC, dll.) memakai nama berkas. Sampul tersemat belum dibaca.

## Status pengujian

Kode ini ditulis tanpa akses jaringan sehingga `npm install`, `next build`, lint, dan uji browser **belum dijalankan**. Wajib dijalankan sebelum deploy: `npm run typecheck`, `npm run lint`, `npm run build`, lalu uji manual (mobile & desktop, pencarian, antrean, playlist, error API).

## Deploy (Vercel)

1. Push ke GitHub (jangan commit `.env.local`).
2. Import di Vercel → set `YOUTUBE_API_KEY` di Project Settings → Environment Variables.
3. Deploy. (Rate limit & cache server bersifat per-instance; untuk skala besar pindahkan ke KV/Redis.)

© 2026 CupTune — Made by MkdirCup
