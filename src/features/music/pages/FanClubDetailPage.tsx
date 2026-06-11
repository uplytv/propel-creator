import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, Users } from "lucide-react";
import {
  useFanClub,
  useFanClubDrops,
  useMyFanClubMembership,
  useMyFanClubBadges,
  useJoinFanClub,
  useCancelFanClubMembership,
} from "../hooks/useFanClubs";
import { FanClubBadge } from "../components/FanClubBadge";
import { toast } from "sonner";

export default function FanClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { data: club, isLoading } = useFanClub(clubId);
  const { data: membership } = useMyFanClubMembership(clubId);
  const { data: drops = [] } = useFanClubDrops(clubId);
  const { data: badges = [] } = useMyFanClubBadges(clubId);
  const joinClub = useJoinFanClub();
  const cancel = useCancelFanClubMembership();

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!club) return <div className="p-6">Fan club not found.</div>;

  const isMember = membership?.status === "active";
  const perks = Array.isArray(club.perks) ? (club.perks as string[]) : [];

  const handleJoin = async () => {
    try {
      await joinClub.mutateAsync({ club_id: club.id });
      toast.success(`Welcome to ${club.name}!`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not join");
    }
  };

  const handleCancel = async () => {
    if (!membership) return;
    await cancel.mutateAsync(membership.id);
    toast.success("Membership cancelled");
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content max-w-3xl mx-auto px-4 py-6">
      <div className="aspect-[2/1] rounded-lg overflow-hidden bg-muted mb-4 relative">
        {club.artwork_url ? (
          <img src={club.artwork_url} alt={club.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{club.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {club.member_count} members
            </span>
            <span>·</span>
            <span>${(club.monthly_price_cents / 100).toFixed(2)}/mo</span>
          </div>
        </div>
        {isMember ? (
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
        ) : (
          <Button onClick={handleJoin} disabled={joinClub.isPending}>
            Join · ${(club.monthly_price_cents / 100).toFixed(0)}/mo
          </Button>
        )}
      </div>

      {club.description && <p className="text-muted-foreground mb-4">{club.description}</p>}

      {perks.length > 0 && (
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-2">Member perks</h3>
          <ul className="space-y-1 text-sm">
            {perks.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <Sparkles className="w-3 h-3 mt-1 text-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {badges.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Your badges</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <FanClubBadge key={b.id} type={b.badge_type} milestone={b.milestone} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-2">Exclusive drops</h3>
        {drops.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drops yet — stay tuned.</p>
        ) : (
          <div className="space-y-2">
            {drops.map((d) => (
              <Card key={d.id} className="p-3 flex items-center gap-3">
                {d.artwork_url ? (
                  <img src={d.artwork_url} alt={d.title} loading="lazy" className="w-14 h-14 rounded object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                    {isMember ? <Sparkles className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{d.title}</p>
                  {d.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{d.description}</p>
                  )}
                </div>
                <Badge variant="outline">{d.content_type}</Badge>
              </Card>
            ))}
          </div>
        )}
        {!isMember && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Join to unlock all exclusive drops
          </p>
        )}
      </div>
    </div>
  );
}
