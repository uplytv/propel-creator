import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMusicOverview, useMusicTopTracks, useMusicTopFans } from '../hooks/useMusicAnalytics';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Music, Users, Heart, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function MusicCreatorAnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>(30);

  const { data: overview = [] } = useMusicOverview(user?.id, range);
  const { data: top = [] } = useMusicTopTracks(user?.id, range, 10);
  const { data: fans = [] } = useMusicTopFans(user?.id, range, 10);

  const totals = useMemo(() => {
    return overview.reduce(
      (a, r) => ({
        plays: a.plays + Number(r.plays),
        listeners: a.listeners + Number(r.unique_listeners),
        likes: a.likes + Number(r.likes),
        purchases: a.purchases + Number(r.purchases),
        revenue_cents: a.revenue_cents + Number(r.revenue_cents),
      }),
      { plays: 0, listeners: 0, likes: 0, purchases: 0, revenue_cents: 0 },
    );
  }, [overview]);

  const series = useMemo(
    () =>
      overview.map((r) => ({
        day: new Date(r.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Plays: Number(r.plays),
        Revenue: Number(r.revenue_cents) / 100,
      })),
    [overview],
  );

  return (
    <div className="mobile-safe-content mx-auto max-w-5xl space-y-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Music analytics</h1>
          <p className="text-sm text-muted-foreground">Your catalog at a glance.</p>
        </div>
        <div className="inline-flex rounded-full border border-border p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-full px-3 h-8 text-xs font-bold',
                range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {r}d
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard icon={Music} label="Plays" value={totals.plays.toLocaleString()} />
        <StatCard icon={Users} label="Listeners" value={totals.listeners.toLocaleString()} />
        <StatCard icon={Heart} label="Likes" value={totals.likes.toLocaleString()} />
        <StatCard icon={ShoppingBag} label="Sales" value={totals.purchases.toLocaleString()} />
        <StatCard icon={DollarSign} label="Revenue" value={formatMoney(totals.revenue_cents)} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold">Plays & revenue</h2>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="playsG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="Plays" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#playsG)" />
              <Area type="monotone" dataKey="Revenue" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#revG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display font-bold">Top tracks</h2>
        {top.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No plays in this period yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {top.map((t, i) => (
              <li key={t.track_id} className="flex items-center gap-3 py-3">
                <span className="w-5 text-right font-display text-sm font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                {t.cover_art_url ? (
                  <img src={t.cover_art_url} alt={t.title} loading="lazy" className="h-12 w-12 rounded-md object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {Number(t.plays).toLocaleString()} plays · {Number(t.unique_listeners).toLocaleString()} listeners ·{' '}
                    {Number(t.likes).toLocaleString()} likes
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold tabular-nums text-primary">
                    {formatMoney(Number(t.revenue_cents))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{Number(t.purchases)} sales</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display font-bold">Top fans</h2>
        {fans.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No fans tracked yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {fans.map((f, i) => (
              <li key={f.user_id} className="flex items-center gap-3 py-3">
                <span className="w-5 text-right font-display text-sm font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
                  {f.user_id.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">Listener {f.user_id.slice(0, 8)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {Number(f.plays)} plays · {Number(f.likes)} likes · {Number(f.purchases)} sales
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold tabular-nums text-primary">{Number(f.score).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">score</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
