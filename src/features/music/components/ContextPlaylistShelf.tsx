import { useMemo } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, Zap, Sunrise, Sunset, Moon, Coffee, Dumbbell, Headphones, PartyPopper, Bed, Utensils } from 'lucide-react';
import { useCurrentContext } from '../hooks/useCurrentContext';
import { useContextPlaylists, useSaveContextPlaylist } from '../hooks/useContextPlaylists';
import { TIME_MOOD_MAP, WEATHER_MOOD_MAP, ACTIVITY_MOOD_MAP, type ActivityBucket } from '../lib/contextResolver';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TIME_ICONS = { morning: Sunrise, afternoon: Sun, evening: Sunset, night: Moon } as const;
const WEATHER_ICONS = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, snowy: CloudSnow, stormy: Zap } as const;
const ACTIVITY_ICONS: Record<ActivityBucket, any> = {
  workout: Dumbbell, focus: Headphones, commute: Coffee, party: PartyPopper, sleep: Bed, cooking: Utensils,
};

export function ContextPlaylistShelf() {
  const ctx = useCurrentContext({ weather: true });
  const { data: saved = [] } = useContextPlaylists();
  const save = useSaveContextPlaylist();
  const nav = useNavigate();

  const TimeIcon = TIME_ICONS[ctx.time];
  const timeMoods = TIME_MOOD_MAP[ctx.time];

  const weatherCard = useMemo(() => {
    if (!ctx.weather) return null;
    const Icon = WEATHER_ICONS[ctx.weather.bucket];
    return { Icon, bucket: ctx.weather.bucket, moods: WEATHER_MOOD_MAP[ctx.weather.bucket], temp: ctx.weather.tempC };
  }, [ctx.weather]);

  const activities: ActivityBucket[] = ['workout', 'focus', 'commute', 'party', 'sleep', 'cooking'];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">For your moment</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/20 to-accent/10 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <TimeIcon className="h-4 w-4" /> Time of day
              </div>
              <h3 className="mt-1 font-display text-lg font-bold capitalize">{ctx.time} mix</h3>
              <p className="mt-1 text-xs text-muted-foreground">{timeMoods.join(' • ')}</p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                save.mutate({
                  title: `${ctx.time[0].toUpperCase()}${ctx.time.slice(1)} mix`,
                  context_type: 'time_of_day',
                  context_params: { bucket: ctx.time },
                  seed_genres: [],
                  seed_moods: timeMoods,
                  cover_url: null,
                })
              }
            >
              Save
            </Button>
          </div>
        </div>

        {weatherCard && (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/20 to-primary/10 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <weatherCard.Icon className="h-4 w-4" /> Weather {weatherCard.temp != null ? `· ${Math.round(weatherCard.temp)}°` : ''}
                </div>
                <h3 className="mt-1 font-display text-lg font-bold capitalize">{weatherCard.bucket} sounds</h3>
                <p className="mt-1 text-xs text-muted-foreground">{weatherCard.moods.join(' • ')}</p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  save.mutate({
                    title: `${weatherCard.bucket[0].toUpperCase()}${weatherCard.bucket.slice(1)} sounds`,
                    context_type: 'weather',
                    context_params: { bucket: weatherCard.bucket },
                    seed_genres: [],
                    seed_moods: weatherCard.moods,
                    cover_url: null,
                  })
                }
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Pick an activity</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
          {activities.map((a) => {
            const Icon = ACTIVITY_ICONS[a];
            const moods = ACTIVITY_MOOD_MAP[a];
            return (
              <button
                key={a}
                onClick={() =>
                  save.mutate({
                    title: `${a[0].toUpperCase()}${a.slice(1)} mix`,
                    context_type: 'activity',
                    context_params: { bucket: a },
                    seed_genres: [],
                    seed_moods: moods,
                    cover_url: null,
                  })
                }
                className="snap-start min-w-[140px] rounded-xl border border-border bg-card p-3 text-left active:scale-[0.97] transition"
              >
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-2 font-display text-sm font-bold capitalize">{a}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{moods.join(' • ')}</div>
              </button>
            );
          })}
        </div>
      </div>

      {saved.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Your context playlists</h3>
          <ul className="space-y-2">
            {saved.slice(0, 6).map((p) => (
              <li
                key={p.id}
                onClick={() => nav(`/music/playlists/${p.id}`)}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer active:scale-[0.99]"
              >
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{p.context_type.replace('_', ' ')}</div>
                </div>
                <span className="text-xs text-muted-foreground">{p.seed_moods.slice(0, 3).join(' • ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
