export interface Mood {
  id: string;
  label: string;
  q: string;
}

export const MOODS: Mood[] = [
  { id: 'feelgood', label: 'Feel Good', q: 'lagu feel good ceria indonesia' },
  { id: 'relax', label: 'Relax', q: 'lagu santai relax akustik indonesia' },
  { id: 'energize', label: 'Energize', q: 'lagu semangat energik olahraga' },
  { id: 'focus', label: 'Focus', q: 'musik fokus belajar instrumental lofi' },
  { id: 'sad', label: 'Sad', q: 'lagu sedih galau indonesia' },
  { id: 'romantic', label: 'Romantic', q: 'lagu romantis cinta indonesia' },
  { id: 'nostalgia', label: 'Nostalgia', q: 'lagu nostalgia kenangan 90an 2000an indonesia' },
  { id: 'sleep', label: 'Sleep', q: 'musik tidur tenang relaksasi' },
];

export const SUGGESTIONS = ['Lagu pop Indonesia', 'Akustik santai', 'Rock Indonesia', 'Indie Indonesia', 'Lagu nostalgia 2000an', 'Musik fokus belajar'];
