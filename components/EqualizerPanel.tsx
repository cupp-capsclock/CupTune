'use client';
import { RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { EQ_LABELS, EQ_MAX, EQ_MIN, EQ_PRESETS } from '@/lib/eq';
import { useEq } from '@/stores/eq';

export default function EqualizerPanel({ isLocal }: { isLocal: boolean }) {
  const enabled = useEq((s) => s.enabled);
  const preset = useEq((s) => s.preset);
  const gains = useEq((s) => s.gains);
  const { setEnabled, setBand, setPreset } = useEq.getState();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Equalizer</h3>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label="Aktifkan equalizer"
          onClick={() => setEnabled(!enabled)}
          className={`press relative h-7 w-12 rounded-full border border-tone-on/30 transition-colors ${enabled ? 'bg-tone-on' : 'bg-tone-bg'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${enabled ? 'left-[26px] bg-tone-bg' : 'left-0.5 bg-tone-on/70'}`} />
        </button>
      </div>

      {!isLocal && (
        <p className="mb-3 rounded-xl bg-tone-bg p-3 text-sm text-tone-mute">
          Equalizer hanya bekerja untuk lagu dari berkas lokal. Audio YouTube diputar oleh pemutar resmi YouTube sehingga tidak bisa diproses. Pengaturanmu tetap tersimpan dan dipakai saat memutar lagu lokal.
        </p>
      )}

      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Preset equalizer">
        {Object.keys(EQ_PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => setPreset(name)}
            aria-pressed={preset === name}
            className={`press h-9 shrink-0 rounded-full border px-4 text-sm font-medium ${preset === name ? 'border-transparent bg-tone-on text-tone-bg' : 'border-tone-on/30'}`}
          >
            {name}
          </button>
        ))}
        {preset === 'Kustom' && <span className="flex h-9 shrink-0 items-center rounded-full bg-tone-bg px-4 text-sm text-tone-mute">Kustom</span>}
      </div>

      <div className={`flex justify-between gap-0.5 transition-opacity ${enabled ? '' : 'opacity-50'}`}>
        {EQ_LABELS.map((label, i) => (
          <div key={label} className="flex w-full min-w-0 flex-col items-center">
            <span className="text-[10px] tabular-nums text-tone-mute">{gains[i] > 0 ? '+' : ''}{gains[i]}</span>
            <div className="relative h-36 w-full">
              <input
                type="range"
                min={EQ_MIN}
                max={EQ_MAX}
                step={1}
                value={gains[i]}
                onChange={(e) => setBand(i, Number(e.target.value))}
                aria-label={`Band ${label} Hz`}
                aria-valuetext={`${gains[i]} dB`}
                style={{ width: 144, '--p': `${((gains[i] - EQ_MIN) / (EQ_MAX - EQ_MIN)) * 100}%` } as CSSProperties}
                className="range absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
              />
            </div>
            <span className="text-[11px] font-medium">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-tone-mute">Hz · rentang {EQ_MIN} hingga +{EQ_MAX} dB</p>

      <button onClick={() => setPreset('Flat')} className="press mx-auto mt-3 flex items-center gap-2 text-sm text-tone-mute">
        <RotateCcw size={14} aria-hidden="true" /> Atur ulang (Flat)
      </button>
    </div>
  );
}
