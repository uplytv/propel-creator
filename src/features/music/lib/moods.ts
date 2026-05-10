// Mood buckets map to one or more genres for filtering.
export const MOODS = [
  'Chill',
  'Hype',
  'Focus',
  'Workout',
  'Party',
  'Romance',
  'Sad',
  'Sleep',
] as const;

export type Mood = (typeof MOODS)[number];

export const MOOD_GENRES: Record<Mood, string[]> = {
  Chill: ['Lo-Fi', 'R&B', 'Jazz'],
  Hype: ['Hip-Hop', 'Electronic', 'Afrobeats'],
  Focus: ['Lo-Fi', 'Classical', 'Jazz'],
  Workout: ['Hip-Hop', 'Electronic', 'Rock'],
  Party: ['Pop', 'Latin', 'Afrobeats', 'Electronic'],
  Romance: ['R&B', 'Pop', 'Latin'],
  Sad: ['R&B', 'Classical', 'Persian'],
  Sleep: ['Lo-Fi', 'Classical'],
};
