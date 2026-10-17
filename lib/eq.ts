// Equalizer 10 band. Hanya berlaku untuk audio lokal (Web Audio); iframe YouTube tidak bisa diproses.
export const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const EQ_LABELS = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'] as const;
export const EQ_MIN = -12;
export const EQ_MAX = 12;

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
  Vokal: [-2, -2, -1, 0, 2, 4, 4, 2, 0, -1],
  Pop: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2],
  Rock: [5, 4, 2, -1, -2, -1, 2, 4, 5, 5],
  Jazz: [3, 2, 1, 2, -2, -2, 0, 1, 2, 3],
  Klasik: [4, 3, 2, 2, -1, -1, 0, 2, 3, 4],
  Dance: [6, 5, 2, 0, -1, 1, 0, 3, 5, 5],
};
