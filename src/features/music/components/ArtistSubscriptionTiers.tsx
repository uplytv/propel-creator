import { Check, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useArtistSubTiers,
  useArtistSubscription,
  useSubscribeToArtist,
  useCancelArtistSubscription,
} from '../hooks/useMusicMonetization';
import { toast } from 'sonner';

interface Props {
  artistId: string;
  artistName?: string;
}

export function ArtistSubscriptionTiers({ artistId, artistName }: Props) {
  const { data: tiers = [], isLoading } = useArtistSubTiers(artistId);
  const { data: currentSub } = useArtistSubscription(artistId);
  const subscribe = useSubscribeToArtist();
  const cancel = useCancelArtistSubscription();

  if (isLoading) return <div className="h-40 rounded-xl bg-muted/20 animate-pulse" />;
  if (tiers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No membership tiers available
      </div>
    );
  }

  const handleSubscribe = async (tierId: string) => {
    try {
      await subscribe.mutateAsync({ artist_id: artistId, tier_id: tierId });
      toast.success(`Subscribed to ${artistName ?? 'artist'} 👑`);
    } catch (e: any) {
      toast.error(e.message ?? 'Subscription failed');
    }
  };

  const handleCancel = async () => {
    if (!currentSub) return;
    try {
      await cancel.mutateAsync(currentSub.id);
      toast.success('Membership canceled');
    } catch (e: any) {
      toast.error(e.message ?? 'Cancel failed');
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {tiers.map((tier) => {
        const active = currentSub?.tier_id === tier.id && currentSub?.status === 'active';
        const perks = Array.isArray(tier.perks) ? (tier.perks as string[]) : [];
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
              ${(tier.monthly_price_cents / 100).toFixed(2)}
              <span className="text-xs text-muted-foreground font-normal">/mo</span>
            </div>
            {tier.description && (
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            )}
            {perks.length > 0 && (
              <ul className="space-y-1 text-sm">
                {perks.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
            {active ? (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancel.isPending}
                className="w-full min-h-[44px] rounded-full"
              >
                Cancel membership
              </Button>
            ) : (
              <Button
                onClick={() => handleSubscribe(tier.id)}
                disabled={subscribe.isPending}
                className="w-full min-h-[44px] rounded-full"
              >
                Join
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
