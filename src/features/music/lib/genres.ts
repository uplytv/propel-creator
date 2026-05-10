export const GENRES = [
  'Hip-Hop',
  'Electronic',
  'Pop',
  'R&B',
  'Rock',
  'Latin',
  'Persian',
  'Afrobeats',
  'Country',
  'Jazz',
  'Classical',
  'Lo-Fi',
  'Other',
] as const;

export type Genre = (typeof GENRES)[number];
