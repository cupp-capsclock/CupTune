import { blobPut } from './db';
import { uid } from './format';
import type { Track } from './types';

function readDuration(f: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const a = new Audio();
    const u = URL.createObjectURL(f);
    let settled = false;
    const done = (v?: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(u);
      resolve(v);
    };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? Math.round(a.duration) : undefined);
    a.onerror = () => done(undefined);
    a.src = u;
    setTimeout(() => done(undefined), 4000);
  });
}

interface Meta { title?: string; artist?: string; album?: string }

function decodeFrame(b: Uint8Array): string {
  const enc = b[0];
  const body = b.subarray(1);
  try {
    if (enc === 1 || enc === 2) {
      const le = enc === 1 ? !(body[0] === 0xfe && body[1] === 0xff) : false;
      const start = enc === 1 && ((body[0] === 0xff && body[1] === 0xfe) || (body[0] === 0xfe && body[1] === 0xff)) ? 2 : 0;
      return new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(body.subarray(start)).replace(/\0+/g, '').trim();
    }
    return new TextDecoder(enc === 3 ? 'utf-8' : 'windows-1252').decode(body).replace(/\0+/g, '').trim();
  } catch {
    return '';
  }
}

/** Baca tag ID3v2.3/2.4 (MP3): judul, artis, album. Format lain → kosong (pakai nama berkas). */
async function readId3(f: File): Promise<Meta> {
  try {
    const h = new Uint8Array(await f.slice(0, 10).arrayBuffer());
    if (h[0] !== 0x49 || h[1] !== 0x44 || h[2] !== 0x33 || (h[3] !== 3 && h[3] !== 4)) return {};
    const ver = h[3];
    const size = ((h[6] & 0x7f) << 21) | ((h[7] & 0x7f) << 14) | ((h[8] & 0x7f) << 7) | (h[9] & 0x7f);
    const buf = new Uint8Array(await f.slice(10, 10 + Math.min(size, 2_000_000)).arrayBuffer());
    const out: Meta = {};
    let p = 0;
    while (p + 10 <= buf.length) {
      const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const fs = ver === 4
        ? ((buf[p + 4] & 0x7f) << 21) | ((buf[p + 5] & 0x7f) << 14) | ((buf[p + 6] & 0x7f) << 7) | (buf[p + 7] & 0x7f)
        : ((buf[p + 4] << 24) | (buf[p + 5] << 16) | (buf[p + 6] << 8) | buf[p + 7]) >>> 0;
      if (fs <= 1 || p + 10 + fs > buf.length) break;
      const val = id === 'TIT2' || id === 'TPE1' || id === 'TALB' ? decodeFrame(buf.subarray(p + 10, p + 10 + fs)) : '';
      if (val) {
        if (id === 'TIT2') out.title = val;
        else if (id === 'TPE1') out.artist = val;
        else out.album = val;
      }
      p += 10 + fs;
    }
    return out;
  } catch {
    return {};
  }
}

export async function addLocalFiles(files: File[]): Promise<{ added: Track[]; failed: number }> {
  const added: Track[] = [];
  let failed = 0;
  for (const f of files) {
    if (!f.type.startsWith('audio/')) {
      failed++;
      continue;
    }
    try {
      const id = `local:${uid()}`;
      await blobPut(id, f);
      const [durationSec, meta] = await Promise.all([readDuration(f), readId3(f)]);
      added.push({
        id,
        source: 'local',
        title: meta.title || f.name.replace(/\.[^.]+$/, ''),
        artist: meta.artist || 'Berkas lokal',
        album: meta.album,
        durationSec,
        addedAt: Date.now(),
      });
    } catch {
      failed++;
    }
  }
  return { added, failed };
}
