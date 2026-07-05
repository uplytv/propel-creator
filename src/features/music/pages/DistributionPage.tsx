import { useEffect, useState } from "react";

function DocTitle({ title }: { title: string }) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
  return null;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPORTED_DSPS,
  useCreateRelease,
  useMyReleases,
  useReleaseTargets,
  useMarkAllSubmitted,
} from "@/features/music/hooks/useDistribution";
import ReleaseStatusRow from "@/features/music/components/ReleaseStatusRow";
import { Loader2, Radio, X } from "lucide-react";

const EXPLAINER_KEY = "release_tracker_explainer_dismissed_v1";

function StatusBadge({ status }: { status: string }) {
  if (status === "not_submitted") return null;
  const map: Record<string, string> = {
    live: "bg-primary/20 text-primary border-primary/30",
    submitted: "bg-white/10 text-white/70 border-white/10",
    pending_review: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    removed: "bg-white/5 text-white/40 border-white/10 line-through",
  };
  const labels: Record<string, string> = {
    live: "Live",
    submitted: "Submitted",
    pending_review: "Pending",
    rejected: "Rejected",
    removed: "Removed",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${map[status] ?? "bg-white/10"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ReleaseManager({ releaseId }: { releaseId: string }) {
  const { data: targets } = useReleaseTargets(releaseId);
  const markAll = useMarkAllSubmitted();
  const { toast } = useToast();

  const targetByPlatform = new Map((targets ?? []).map((t) => [t.platform, t]));

  return (
    <div className="space-y-3 pt-2 border-t border-white/10">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm">Where it's live</h3>
        <button
          onClick={async () => {
            try {
              await markAll.mutateAsync({ releaseId, platforms: SUPPORTED_DSPS });
              toast({ title: "Marked all as submitted" });
            } catch (e: any) {
              toast({ title: "Failed", description: e.message, variant: "destructive" });
            }
          }}
          className="text-xs text-primary underline disabled:opacity-50"
          disabled={markAll.isPending}
        >
          Mark all as submitted
        </button>
      </div>

      <div className="space-y-2">
        {SUPPORTED_DSPS.map((p) => (
          <ReleaseStatusRow
            key={p}
            releaseId={releaseId}
            platform={p}
            target={targetByPlatform.get(p)}
          />
        ))}
      </div>

      {targets && targets.some((t) => t.status !== "not_submitted") && (
        <div className="flex flex-wrap gap-2 pt-1">
          {targets
            .filter((t) => t.status !== "not_submitted")
            .map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 text-xs text-white/70">
                {t.platform.replace("_", " ")} <StatusBadge status={t.status} />
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

export default function DistributionPage() {
  const { toast } = useToast();
  const { data: releases, isLoading } = useMyReleases();
  const createRelease = useCreateRelease();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);
  const [explainerDismissed, setExplainerDismissed] = useState(true);

  useEffect(() => {
    setExplainerDismissed(localStorage.getItem(EXPLAINER_KEY) === "true");
  }, []);

  const dismissExplainer = () => {
    localStorage.setItem(EXPLAINER_KEY, "true");
    setExplainerDismissed(true);
  };

  return (
    <div className="mobile-safe-content max-w-3xl mx-auto p-4 space-y-6">
      <DocTitle title="Release Tracker — UPLY" />

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Release Tracker</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track where your music is live across DSPs. UPLY does not distribute on your behalf — submit
          through your distributor of choice, then log status here.
        </p>
      </header>

      {!explainerDismissed && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="text-2xl leading-none">📡</div>
            <div className="flex-1 text-sm text-white/80 space-y-1">
              <p className="font-semibold text-white">How this works</p>
              <p>
                UPLY isn't a distributor. To get your music on Spotify, Apple Music, and other DSPs
                you'll need a service like DistroKid, TuneCore, CD Baby, or Ditto. Once submitted,
                mark each platform's status here to keep everything organized — and to power your
                "Listen anywhere" universal links automatically.
              </p>
            </div>
            <button
              onClick={dismissExplainer}
              aria-label="Dismiss"
              className="p-1.5 rounded-md hover:bg-white/10"
              style={{ minWidth: 36, minHeight: 36 }}
            >
              <X className="w-4 h-4" />
            </button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Track a new release</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artist">Artist name</Label>
            <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
          </div>
          <Button
            disabled={!title || !artist || createRelease.isPending}
            onClick={async () => {
              try {
                await createRelease.mutateAsync({ title, artist_name: artist });
                setTitle("");
                setArtist("");
                toast({ title: "Release added" });
              } catch (e: any) {
                toast({ title: "Failed", description: e.message, variant: "destructive" });
              }
            }}
          >
            {createRelease.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add release
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your releases</h2>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        {releases?.length === 0 && (
          <p className="text-sm text-muted-foreground">No releases yet.</p>
        )}
        {releases?.map((r) => (
          <Card key={r.id} className={selectedRelease === r.id ? "border-primary" : ""}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.artist_name}</div>
                </div>
                <Button
                  size="sm"
                  variant={selectedRelease === r.id ? "default" : "outline"}
                  onClick={() => setSelectedRelease(selectedRelease === r.id ? null : r.id)}
                >
                  {selectedRelease === r.id ? "Hide" : "Manage"}
                </Button>
              </div>

              {selectedRelease === r.id && <ReleaseManager releaseId={r.id} />}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
