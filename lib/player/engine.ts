import { EQ_FREQS } from '@/lib/eq';
import { blobGet } from '@/lib/db';
import type { Source, Track } from '@/lib/types';
import { usePlayer } from '@/stores/player';
import type { Cmd } from '@/stores/player';
import { useProgress } from '@/stores/progress';
import { toast } from '@/stores/toast';

interface YTPlayer {
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  setVolume(v: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_ERR: Record<number, string> = {
  2: 'ID video tidak valid.',
  5: 'Pemutar tidak dapat memutar konten ini.',
  100: 'Video tidak ditemukan atau sudah dihapus.',
  101: 'Pemilik video membatasi pemutaran di luar YouTube.',
  150: 'Pemilik video membatasi pemutaran di luar YouTube.',
};

class Engine {
  private host: HTMLElement | null = null;
  private yt: YTPlayer | null = null;
  private ytP: Promise<YTPlayer> | null = null;
  private audio: HTMLAudioElement | null = null;
  private objUrl: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private loadAt = 0;
  private bound = false;
  private active: Source | null = null;
  private wantPlay = false; // niat pengguna: ingin memutar (dipakai untuk melanjutkan otomatis saat layar mati)
  private resumeTries = 0;
  private resumeAt = 0;
  private lastPosSync = 0;
  private visBound = false;
  private actx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private tapped = false;
  loadedId: string | null = null;

  private pre: GainNode | null = null;
  private bands: BiquadFilterNode[] = [];
  private eqWant: { enabled: boolean; gains: number[] } = { enabled: false, gains: EQ_FREQS.map(() => 0) };

  /** Terapkan pengaturan equalizer ke graf Web Audio (jika sudah dibangun). */
  setEq(enabled: boolean, gains: number[]) {
    this.eqWant = { enabled, gains };
    this.applyEq();
  }

  private applyEq() {
    if (!this.actx || !this.pre || !this.bands.length) return;
    const g = this.eqWant.enabled ? this.eqWant.gains : this.eqWant.gains.map(() => 0);
    const t = this.actx.currentTime;
    this.bands.forEach((b, i) => b.gain.setTargetAtTime(g[i] ?? 0, t, 0.02));
    // Headroom otomatis: turunkan level sebesar boost tertinggi agar tidak clipping/pecah.
    this.pre.gain.setTargetAtTime(Math.pow(10, -Math.max(0, ...g) / 20), t, 0.02);
  }

  /**
   * Graf audio lokal: sumber → preamp → 10 filter EQ → analyser → keluaran.
   * Hanya audio lokal (iframe YouTube lintas-origin tidak bisa diproses/dianalisis).
   * Audio baru dialihkan lewat Web Audio jika context benar-benar 'running', agar suara tidak pernah jadi hening.
   */
  async getAnalyser(): Promise<AnalyserNode | null> {
    if (this.analyser) return this.analyser;
    if (this.active !== 'local' || !this.audio || this.tapped) return null;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.actx = this.actx ?? new AC();
      if (this.actx.state !== 'running') await this.actx.resume().catch(() => {});
      if (this.actx.state !== 'running' || !this.audio) return null;
      this.tapped = true;
      const ctx = this.actx;
      const src = ctx.createMediaElementSource(this.audio);
      const pre = ctx.createGain();
      const bands = EQ_FREQS.map((f, i) => {
        const b = ctx.createBiquadFilter();
        b.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length - 1 ? 'highshelf' : 'peaking';
        b.frequency.value = f;
        b.Q.value = 1.1;
        b.gain.value = 0;
        return b;
      });
      const an = ctx.createAnalyser();
      an.fftSize = 128;
      an.smoothingTimeConstant = 0.82;
      let node: AudioNode = src;
      for (const n of [pre, ...bands, an]) {
        node.connect(n);
        node = n;
      }
      node.connect(ctx.destination);
      this.pre = pre;
      this.bands = bands;
      this.analyser = an;
      this.applyEq();
      return an;
    } catch {
      return null;
    }
  }

  attach(h: HTMLElement) {
    this.host = h;
  }

  detach() {
    this.stopTimer();
    if (this.visBound) {
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.visBound = false;
    }
    try {
      this.yt?.destroy();
    } catch {
      /* diabaikan */
    }
    this.yt = null;
    this.ytP = null;
    if (this.audio) {
      this.audio.onended = this.audio.onplaying = this.audio.onpause = this.audio.onwaiting = this.audio.onerror = null;
      this.audio.pause();
      this.audio = null;
    }
    this.revoke();
    this.loadedId = null;
    this.host = null;
    this.analyser = null;
    this.pre = null;
    this.bands = [];
    this.tapped = false;
    void this.actx?.close().catch(() => {});
    this.actx = null;
  }

  private onVisibility = () => {
    // Kembali ke aplikasi: jika pengguna masih ingin memutar tetapi sistem menjeda, lanjutkan.
    if (document.visibilityState !== 'visible') return;
    this.resumeTries = 0;
    if (this.wantPlay && this.active === 'youtube' && usePlayer.getState().status === 'paused') {
      try {
        this.yt?.playVideo();
      } catch {
        /* diabaikan */
      }
    }
  };

  bind() {
    // Listener visibilitas dipasang ulang setiap attach (detach melepasnya); subscribe store cukup sekali.
    if (!this.visBound && typeof document !== 'undefined') {
      this.visBound = true;
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    if (this.bound) return;
    this.bound = true;
    let lastToken = usePlayer.getState().loadToken;
    let lastCmd: Cmd = usePlayer.getState().cmd;
    usePlayer.subscribe((s) => {
      if (s.loadToken !== lastToken) {
        lastToken = s.loadToken;
        const t = s.queue[s.index];
        if (t) void this.load(t, true);
      }
      if (s.cmd !== lastCmd) {
        lastCmd = s.cmd;
        if (s.cmd) this.run(s.cmd);
      }
    });
  }

  private run(c: NonNullable<Cmd>) {
    if (c.type === 'play') this.play();
    else if (c.type === 'pause') this.pause();
    else if (c.type === 'seek') this.seek(c.value ?? 0);
    else this.applyVolume();
  }

  private revoke() {
    if (this.objUrl) URL.revokeObjectURL(this.objUrl);
    this.objUrl = null;
  }

  private report(s: 'playing' | 'paused' | 'loading') {
    usePlayer.getState()._report(s);
  }

  private fail(msg: string) {
    this.wantPlay = false;
    this.loadedId = null;
    this.stopTimer();
    usePlayer.getState()._trackFailed(msg);
  }

  private playRejected(e: unknown) {
    if ((e as Error)?.name === 'NotAllowedError') {
      this.report('paused');
      toast('Pemutaran otomatis diblokir browser. Tekan tombol putar.', 'err');
    } else {
      this.fail('Tidak dapat memutar audio ini.');
    }
  }

  // ---------- YouTube IFrame Player ----------
  private onYtState = (e: { data: number }) => {
    const cur = usePlayer.getState();
    const t = cur.queue[cur.index];
    if (!t || this.loadedId !== t.id) return;
    switch (e.data) {
      case 1:
        this.resumeTries = 0;
        this.report('playing');
        this.startTimer();
        break;
      case 2:
        this.stopTimer();
        // Dijeda sistem/browser saat layar mati atau pindah aplikasi (bukan oleh pengguna)?
        // Coba lanjutkan; jika browser menolak, status tetap 'paused'.
        if (this.wantPlay && typeof document !== 'undefined' && document.visibilityState === 'hidden' && this.resumeTries < 3 && Date.now() - this.resumeAt > 400) {
          this.resumeTries++;
          this.resumeAt = Date.now();
          try {
            this.yt?.playVideo();
            break;
          } catch {
            /* lanjut ke report paused */
          }
        }
        if (Date.now() - this.loadAt > 500) this.report('paused');
        break;
      case 3:
        this.report('loading');
        break;
      case 5:
        this.report('paused');
        break;
      case 0:
        this.stopTimer();
        usePlayer.getState().next(true);
        break;
    }
  };

  private ensureYT(): Promise<YTPlayer> {
    if (this.ytP) return this.ytP;
    const p = new Promise<YTPlayer>((resolve, reject) => {
      const create = () => {
        if (!this.host || !window.YT) return reject(new Error('Pemutar belum siap.'));
        const mount = document.createElement('div');
        this.host.innerHTML = '';
        this.host.appendChild(mount);
        const NS = window.YT;
        const player: YTPlayer = new NS.Player(mount, {
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, controls: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              this.yt = player;
              resolve(player);
            },
            onStateChange: this.onYtState,
            onError: (e: { data: number }) => this.fail(YT_ERR[e.data] ?? 'Terjadi kesalahan saat memutar video.'),
            onAutoplayBlocked: () => {
              this.report('paused');
              toast('Pemutaran otomatis diblokir browser. Tekan tombol putar.', 'err');
            },
          },
        });
      };
      if (window.YT?.Player) {
        create();
        return;
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        create();
      };
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script');
        s.id = 'yt-iframe-api';
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        s.onerror = () => reject(new Error('Pemutar YouTube tidak dapat dimuat. Periksa koneksi atau pemblokir iklan.'));
        document.head.appendChild(s);
      }
    });
    p.catch(() => {
      this.ytP = null;
    });
    this.ytP = p;
    return p;
  }

  // ---------- Audio lokal ----------
  private getAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = 'auto';
    a.onended = () => {
      this.stopTimer();
      usePlayer.getState().next(true);
    };
    a.onplaying = () => {
      this.report('playing');
      this.startTimer();
    };
    a.onpause = () => {
      this.stopTimer();
      if (a.ended) return;
      if (this.wantPlay && document.visibilityState === 'hidden' && this.resumeTries < 3 && Date.now() - this.resumeAt > 400) {
        this.resumeTries++;
        this.resumeAt = Date.now();
        a.play().catch(() => this.report('paused'));
        return;
      }
      if (Date.now() - this.loadAt > 400) this.report('paused');
    };
    a.onwaiting = () => this.report('loading');
    a.onerror = () => {
      if (a.getAttribute('src')) this.fail('Berkas audio tidak dapat diputar.');
    };
    this.audio = a;
    return a;
  }

  // ---------- kontrol ----------
  async load(track: Track, autoplay: boolean) {
    const seq = ++this.seq;
    this.wantPlay = autoplay;
    this.resumeTries = 0;
    this.loadAt = Date.now();
    this.loadedId = null;
    usePlayer.getState()._report('loading');
    useProgress.getState().set(0, track.durationSec ?? 0);
    try {
      if (track.source === 'youtube' && track.videoId) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          throw new Error('Kamu sedang offline. Sambungkan internet untuk memutar dari YouTube.');
        }
        this.audio?.pause();
        this.active = 'youtube';
        const p = await this.ensureYT();
        if (seq !== this.seq) return;
        this.loadedId = track.id;
        this.applyVolume();
        if (autoplay) p.loadVideoById(track.videoId);
        else {
          p.cueVideoById(track.videoId);
          this.report('paused');
        }
      } else if (track.source === 'local') {
        try {
          this.yt?.pauseVideo();
        } catch {
          /* diabaikan */
        }
        this.active = 'local';
        const blob = await blobGet(track.id);
        if (seq !== this.seq) return;
        if (!blob) throw new Error('Berkas audio lokal tidak ditemukan. Tambahkan lagi lewat Pustaka.');
        const a = this.getAudio();
        a.pause();
        this.revoke();
        this.objUrl = URL.createObjectURL(blob);
        a.src = this.objUrl;
        this.loadedId = track.id;
        this.applyVolume();
        if (autoplay) await a.play();
        else this.report('paused');
      } else {
        throw new Error('Sumber media tidak didukung.');
      }
    } catch (e) {
      if (seq !== this.seq) return;
      if ((e as Error).name === 'NotAllowedError') return this.playRejected(e);
      this.fail((e as Error).message || 'Gagal memutar lagu ini.');
    }
  }

  play() {
    const s = usePlayer.getState();
    const cur = s.queue[s.index];
    if (!cur) return;
    this.wantPlay = true;
    this.resumeTries = 0;
    if (this.loadedId !== cur.id) {
      void this.load(cur, true);
      return;
    }
    if (this.active === 'youtube') this.yt?.playVideo();
    else this.audio?.play().catch((e) => this.playRejected(e));
  }

  pause() {
    this.wantPlay = false;
    if (this.active === 'youtube') this.yt?.pauseVideo();
    else this.audio?.pause();
  }

  seek(t: number) {
    if (this.active === 'youtube') this.yt?.seekTo(t, true);
    else if (this.audio) this.audio.currentTime = t;
    useProgress.getState().set(t);
  }

  applyVolume() {
    const { volume, muted } = usePlayer.getState();
    try {
      if (this.yt) {
        this.yt.setVolume(volume);
        if (muted) this.yt.mute();
        else this.yt.unMute();
      }
    } catch {
      /* diabaikan */
    }
    if (this.audio) {
      this.audio.volume = volume / 100;
      this.audio.muted = muted;
    }
  }

  private startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 500);
    this.tick();
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    let pos = 0;
    let dur = 0;
    try {
      if (this.active === 'youtube' && this.yt) {
        pos = this.yt.getCurrentTime();
        dur = this.yt.getDuration();
      } else if (this.audio) {
        pos = this.audio.currentTime;
        dur = this.audio.duration;
      }
    } catch {
      return;
    }
    const s = usePlayer.getState();
    const total = Number.isFinite(dur) && dur > 0 ? dur : s.queue[s.index]?.durationSec ?? 0;
    useProgress.getState().set(pos, total);
    // Posisi untuk bilah progres di lockscreen / notifikasi media.
    const now = Date.now();
    if (now - this.lastPosSync > 2000 && total > 0 && pos >= 0 && pos <= total && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      this.lastPosSync = now;
      try {
        navigator.mediaSession.setPositionState({ duration: total, position: pos, playbackRate: 1 });
      } catch {
        /* tidak didukung */
      }
    }
  }
}

export const engine = new Engine();
