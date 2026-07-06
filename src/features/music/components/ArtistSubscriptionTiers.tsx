import { useNavigate } from 'react-router-dom';
import { Check, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscriptionTiers, useMemberSubscription } from '@/hooks/useStripeAccount';
import FollowButton from '@/components/FollowButton';

interface Props {
  artistId: string;
  artistName?: string;
}

/**
 * Honest membership panel.
 *
 * Previously this rendered `artist_sub_tiers` with a "Join" button that
 * upserted an `artist_subscriptions` row as 'active' with NO payment —
 * fans subscribed for free and artists saw phantom members. It now shows
 * the artist's REAL Stripe-billed subscription tiers (`subscription_tiers`)
 * and sends fans through the existing community tier checkout. If the
 * artist hasn't set up paid tiers, fans are offered a free Follow instead.
 */
export function ArtistSubscriptionTiers({ artistId, artistName }: Props) {
  const navigate = useNavigate();
  const { data: tiers = [], isLoading } = useSubscriptionTiers(artistId);
  const { data: memberSub } = useMemberSubscription(artistId);

  if (isLoading) return <div className="h-40 rounded-xl bg-muted/20 animate-pulse" />;

  if (tiers.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-muted-foreground text-sm">
          {artistName ?? 'This artist'} hasn't enabled paid subscriptions yet.
        </p>
        <div className="flex justify-center">
          <FollowButton targetUserId={artistId} size="md" />
        </div>
      </div>
    );
  }

  const goToCheckout = () => navigate(`/community/${artistId}/pricing`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map((tier) => {
          const active = memberSub?.tier_id === tier.id;
          return (
            <Card
              key={tier.id}
              className={`p-4 space-y-3 border ${
                active ? 'border-primary bg-primary/5' : 'border-border/40 bg-card/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">{tier.name}</h4>
              </div>
              <div className="text-2xl font-bold">
                ${Number(tier.price_monthly).toFixed(2)}
                <span className="text-xs text-muted-foreground font-normal">/mo</span>
              </div>
              {tier.description && (
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              )}
              {active ? (
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary min-h-[44px]">
                  <Check className="w-4 h-4" /> You're a member
                </div>
              ) : (
                <Button onClick={goToCheckout} className="w-full min-h-[44px] rounded-full">
                  Join
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      {memberSub && (
        <p className="text-xs text-center text-muted-foreground">
          Manage your membership from the{' '}
          <button onClick={goToCheckout} className="underline underline-offset-2">
            community pricing page
          </button>
          .
        </p>
      )}
    </div>
  );
}
