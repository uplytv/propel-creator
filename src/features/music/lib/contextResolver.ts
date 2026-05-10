export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night';
export type WeatherBucket = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
export type ActivityBucket = 'workout' | 'focus' | 'commute' | 'party' | 'sleep' | 'cooking';

export function getTimeBucket(date = new Date()): TimeBucket {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

export const TIME_MOOD_MAP: Record<TimeBucket, string[]> = {
  morning: ['uplifting', 'fresh', 'energetic'],
  afternoon: ['focus', 'chill', 'feel-good'],
  evening: ['mellow', 'romantic', 'sunset'],
  night: ['late-night', 'lo-fi', 'ambient'],
};

export const WEATHER_MOOD_MAP: Record<WeatherBucket, string[]> = {
  sunny: ['feel-good', 'tropical', 'summer'],
  cloudy: ['indie', 'mellow', 'thoughtful'],
  rainy: ['lo-fi', 'jazz', 'melancholy'],
  snowy: ['acoustic', 'cozy', 'winter'],
  stormy: ['cinematic', 'dramatic', 'rock'],
};

export const ACTIVITY_MOOD_MAP: Record<ActivityBucket, string[]> = {
  workout: ['high-energy', 'hype', 'edm'],
  focus: ['lo-fi', 'instrumental', 'ambient'],
  commute: ['podcast-vibe', 'pop', 'indie'],
  party: ['party', 'dance', 'hits'],
  sleep: ['ambient', 'piano', 'sleep'],
  cooking: ['jazz', 'soul', 'feel-good'],
};

export interface WeatherSnapshot {
  bucket: WeatherBucket;
  tempC: number | null;
}

export async function fetchWeatherByCoords(lat: number, lon: number): Promise<WeatherSnapshot | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const code: number = j?.current?.weather_code ?? 0;
    const tempC: number = j?.current?.temperature_2m ?? null;
    let bucket: WeatherBucket = 'sunny';
    if ([0, 1].includes(code)) bucket = 'sunny';
    else if ([2, 3, 45, 48].includes(code)) bucket = 'cloudy';
    else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) bucket = 'rainy';
    else if ([71, 73, 75, 77, 85, 86].includes(code)) bucket = 'snowy';
    else if ([95, 96, 99].includes(code)) bucket = 'stormy';
    return { bucket, tempC };
  } catch {
    return null;
  }
}
