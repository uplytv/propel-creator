import { useState } from "react";
import { Trophy, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useShowTipLeaderboard, useSendShowTip } from "../hooks/useShowTips";

interface Props {
  showId: string;
  artistId: string;
  currency?: string;
}

const PRESETS = [200, 500, 1000, 2500];

export function ShowTipLeaderboard({ showId, artistId, currency = "usd" }: Props) {
  const { data: leaders = [], isLoading } = useShowTipLeaderboard(showId);
  const sendTip = useSendShowTip();
  const [message, setMessage] = useState("");

  const handleTip = async (cents: number) => {
    try {
      await sendTip.mutateAsync({
        show_id: showId,
        artist_id: artistId,
        amount_cents: cents,
        currency,
        message: message.trim() || undefined,
      });
      setMessage("");
      toast({ title: "Tip sent", description: `Thanks for supporting the artist!` });
    } catch (e: any) {
      toast({ title: "Couldn't send tip", description: e.message, variant: "destructive" });
    }
  };

  const fmt = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);

  const medal = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  return (
    <Card className="p-4 space-y-4 bg-card/50 border-border">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Top Tippers</h3>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : leaders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Be the first to tip the artist
          </p>
        ) : (
          leaders.map((l) => (
            <div key={l.fan_id} className="flex items-center gap-3 py-1.5">
              <span className="w-8 text-sm font-semibold text-center">{medal(l.rank)}</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={l.avatar_url ?? undefined} />
                <AvatarFallback>{(l.display_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {l.display_name ?? "Anonymous fan"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.tip_count} tip{l.tip_count !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-sm font-semibold text-primary">{fmt(l.total_cents)}</span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <input
          type="text"
          maxLength={140}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message (optional)"
          className="w-full px-3 py-2 text-base rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((cents) => (
            <Button
              key={cents}
              size="sm"
              variant="outline"
              disabled={sendTip.isPending}
              onClick={() => handleTip(cents)}
              className="min-h-11"
            >
              {fmt(cents)}
            </Button>
          ))}
        </div>
        <Button
          className="w-full min-h-11"
          disabled={sendTip.isPending}
          onClick={() => handleTip(500)}
        >
          <Heart className="h-4 w-4 mr-2" />
          {sendTip.isPending ? "Sending..." : "Send tip"}
        </Button>
      </div>
    </Card>
  );
}
