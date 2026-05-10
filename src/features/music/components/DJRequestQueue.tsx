import { useState } from "react";
import { Music2, Send, Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  useDJRequestQueue,
  useCreateDJRequest,
  useUpdateDJRequestStatus,
  useCancelDJRequest,
  type DJSongRequest,
} from "../hooks/useDJRequests";
import { useAuth } from "@/context/AuthContext";

const TIP_PRESETS = [0, 200, 500, 1000];

interface Props {
  sessionId: string;
  djId: string;
  currency?: string;
}

export function DJRequestQueue({ sessionId, djId, currency = "usd" }: Props) {
  const { user } = useAuth();
  const isDJ = user?.id === djId;
  const { data: queue = [], isLoading } = useDJRequestQueue(sessionId);
  const createReq = useCreateDJRequest();
  const updateStatus = useUpdateDJRequestStatus();
  const cancelReq = useCancelDJRequest();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tip, setTip] = useState(0);

  const fmt = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    try {
      await createReq.mutateAsync({
        session_id: sessionId,
        dj_id: djId,
        track_title: title.trim(),
        track_artist: artist.trim() || undefined,
        tip_amount_cents: tip,
        currency,
      });
      setTitle("");
      setArtist("");
      setTip(0);
      toast({ title: "Request sent", description: "The DJ will see your request" });
    } catch (e: any) {
      toast({ title: "Couldn't send request", description: e.message, variant: "destructive" });
    }
  };

  const renderRow = (r: DJSongRequest) => {
    const isOwn = r.fan_id === user?.id;
    return (
      <div
        key={r.id}
        className={`flex items-center gap-3 p-3 rounded-md border ${
          r.status === "playing"
            ? "border-primary bg-primary/10 animate-pulse"
            : "border-border bg-background/40"
        }`}
      >
        <Avatar className="h-9 w-9">
          <AvatarImage src={r.fan_avatar ?? undefined} />
          <AvatarFallback>{(r.fan_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{r.track_title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {r.track_artist || "—"} · {r.fan_name ?? "Anon"}
          </p>
        </div>
        {r.tip_amount_cents > 0 && (
          <Badge className="bg-primary/20 text-primary">
            <DollarSign className="h-3 w-3" />
            {fmt(r.tip_amount_cents)}
          </Badge>
        )}
        {r.status === "playing" && (
          <Badge className="bg-primary text-primary-foreground">Now</Badge>
        )}
        {isDJ && r.status === "pending" && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              className="min-h-9 px-2"
              onClick={() =>
                updateStatus.mutate({ id: r.id, session_id: sessionId, status: "playing" })
              }
            >
              Play
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-9 px-2"
              onClick={() =>
                updateStatus.mutate({ id: r.id, session_id: sessionId, status: "declined" })
              }
            >
              Skip
            </Button>
          </div>
        )}
        {isDJ && r.status === "playing" && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-9"
            onClick={() =>
              updateStatus.mutate({ id: r.id, session_id: sessionId, status: "played" })
            }
          >
            Done
          </Button>
        )}
        {!isDJ && isOwn && r.status === "pending" && (
          <Button
            size="sm"
            variant="ghost"
            className="min-h-9"
            onClick={() => cancelReq.mutate({ id: r.id, session_id: sessionId })}
          >
            Cancel
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4 bg-card/50 border-border">
      <div className="flex items-center gap-2">
        <Music2 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Live Request Queue</h3>
        <Badge variant="outline" className="ml-auto">{queue.length}</Badge>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : queue.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No requests yet — be the first
          </p>
        ) : (
          queue.map(renderRow)
        )}
      </div>

      {!isDJ && (
        <div className="space-y-2 pt-3 border-t border-border">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Track title"
            maxLength={120}
            className="w-full px-3 py-2 text-base rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist (optional)"
            maxLength={120}
            className="w-full px-3 py-2 text-base rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={tip === c ? "default" : "outline"}
                onClick={() => setTip(c)}
                className="min-h-11"
              >
                {c === 0 ? "No tip" : fmt(c)}
              </Button>
            ))}
          </div>
          <Button
            className="w-full min-h-11"
            disabled={!title.trim() || createReq.isPending}
            onClick={handleSubmit}
          >
            <Send className="h-4 w-4 mr-2" />
            {createReq.isPending ? "Sending..." : tip > 0 ? `Request (${fmt(tip)} tip)` : "Request"}
          </Button>
        </div>
      )}
    </Card>
  );
}
