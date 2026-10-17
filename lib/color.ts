// Warna dominan sampul untuk latar & glow. Selalu ada fallback deterministik agar tidak pernah kosong.
export type RGB = [number, number, number];

export function hashHue(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function hsl(h: number, s: number, l: number): RGB {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

export function fallbackColor(id: string): RGB {
  return hsl(hashHue(id), 0.78, 0.58);
}

/** Ambil warna dominan dari gambar. Mengembalikan null jika gambar tidak bisa dibaca (CORS/jaringan). */
export function sampleColor(src: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const x = c.getContext('2d', { willReadFrequently: true });
        if (!x) return resolve(null);
        x.drawImage(img, 0, 0, 16, 16);
        const d = x.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const mx = Math.max(d[i], d[i + 1], d[i + 2]);
          const mn = Math.min(d[i], d[i + 1], d[i + 2]);
          if (mx < 30) continue; // abaikan area hampir hitam
          const wt = (mx - mn) / 255 + 0.05; // utamakan piksel berwarna
          r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
        }
        if (w === 0) return resolve(null);
        let out: RGB = [r / w, g / w, b / w];
        const peak = Math.max(...out);
        const k = peak < 150 ? 150 / Math.max(peak, 1) : 1; // cerahkan warna gelap agar glow terlihat
        out = [Math.min(255, out[0] * k), Math.min(255, out[1] * k), Math.min(255, out[2] * k)];
        resolve(out.map(Math.round) as RGB);
      } catch {
        resolve(null); // canvas tercemar (tanpa CORS)
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/** Terapkan warna sampul sebagai CSS var: --cover/--cover2 (glow) dan --tone-* (palet tonal gelap ala Material You). */
export function applyCoverVars(c: RGB) {
  const root = document.documentElement.style;
  root.setProperty('--cover', c.join(' '));
  const mx = Math.max(...c), mn = Math.min(...c);
  const l = (mx + mn) / 510;
  const d = mx - mn;
  const s = d === 0 ? 0.2 : d / (255 * (1 - Math.abs(2 * l - 1)) || 1);
  let h = 0;
  if (d !== 0) {
    if (mx === c[0]) h = ((c[1] - c[2]) / d) % 6;
    else if (mx === c[1]) h = (c[2] - c[0]) / d + 2;
    else h = (c[0] - c[1]) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const sat = Math.min(0.6, Math.max(0.18, s));
  root.setProperty('--cover2', hsl((h + 45) % 360, Math.min(0.85, Math.max(0.5, s)), 0.55).join(' '));
  root.setProperty('--tone-bg', hsl(h, sat * 0.5, 0.075).join(' ')); // latar
  root.setProperty('--tone-card', hsl(h, sat * 0.45, 0.16).join(' ')); // tombol sekunder
  root.setProperty('--tone-on', hsl(h, Math.min(0.5, sat), 0.9).join(' ')); // teks & tombol utama
  root.setProperty('--tone-mute', hsl(h, sat * 0.35, 0.7).join(' ')); // teks sekunder
}
