import { useEffect, useState } from 'react';
import { fetchWeatherByCoords, getTimeBucket, type TimeBucket, type WeatherSnapshot } from '../lib/contextResolver';

export interface CurrentContext {
  time: TimeBucket;
  weather: WeatherSnapshot | null;
  loadingWeather: boolean;
}

export function useCurrentContext(opts: { weather?: boolean } = {}): CurrentContext {
  const [time, setTime] = useState<TimeBucket>(() => getTimeBucket());
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loadingWeather, setLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeBucket()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!opts.weather || !navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const w = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        setWeather(w);
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 8000, maximumAge: 600_000 }
    );
  }, [opts.weather]);

  return { time, weather, loadingWeather };
}
