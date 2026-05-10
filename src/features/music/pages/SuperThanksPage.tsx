import { useParams } from 'react-router-dom';
import { Heart, Sparkles, Users, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TipArtistButton } from '../components/TipArtistButton';
import { TipLeaderboardRow } from '../components/TipLeaderboardRow';
import {
  useArtistRecentTips,
  useArtistTipTotals,
  useTopTippers,
} from '../hooks/useSuperThanks';

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Heart;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4 bg-card/60">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </Card>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SuperThanksPage() {
  const { artistId = '' } = useParams<{ artistId: string }>();
  const totals = useArtistTipTotals(artistId);
  const top = useTopTippers(artistId, 10);
  const recent = useArtistRecentTips(artistId, 20);

  const totalDollars = ((totals.data?.total_cents ?? 0) / 100).toFixed(2);

  return (
    <div className="mobile-safe-content max-w-2xl mx-auto p-4 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Super Thanks</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Show love to your favorite artist. Every tip is a public shout-out.
        </p>
        <TipArtistButton artistId={artistId} />
      </header>

      <section className="grid grid-cols-3 gap-2">
        {totals.isLoading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : (
          <>
            <StatCard icon={DollarSign} label="Raised" value={`$${totalDollars}`} />
            <StatCard icon={Heart} label="Tips" value={String(totals.data?.tip_count ?? 0)} />
            <StatCard
              icon={Users}
              label="Supporters"
              value={String(totals.data?.supporter_count ?? 0)}
            />
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top supporters</h2>
        {top.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (top.data ?? []).length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Be the first to tip and claim the #1 spot.
          </Card>
        ) : (
          <div className="space-y-2">
            {(top.data ?? []).map((entry, i) => (
              <TipLeaderboardRow key={entry.fan_id} rank={i + 1} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent thanks</h2>
        {recent.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (recent.data ?? []).length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No tips yet. Your message could be the first one shown here.
          </Card>
        ) : (
          <div className="space-y-2">
            {(recent.data ?? []).map((tip: any) => (
              <Card
                key={tip.id}
                className="p-3 flex items-start gap-3 bg-card/50 border-border/40"
              >
                <Heart className="w-4 h-4 text-primary mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-primary">
                      ${(tip.amount_cents / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(tip.created_at)}
                    </span>
                  </div>
                  {tip.message ? (
                    <p className="text-sm mt-1 break-words">{tip.message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">No message</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
