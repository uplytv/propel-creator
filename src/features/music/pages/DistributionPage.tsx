import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPORTED_DSPS,
  useCreateRelease,
  useMyReleases,
  useReleaseTargets,
  useSubmitToDSPs,
} from "@/features/music/hooks/useDistribution";
import { DSPStatusBadge } from "@/features/music/components/DSPStatusBadge";
import { Loader2, Disc3 } from "lucide-react";

export default function DistributionPage() {
  const { toast } = useToast();
  const { data: releases, isLoading } = useMyReleases();
  const createRelease = useCreateRelease();
  const submit = useSubmitToDSPs();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>(SUPPORTED_DSPS);

  const { data: targets } = useReleaseTargets(selectedRelease ?? undefined);

  const toggle = (p: string) =>
    setChosen((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));

  return (
    <div className="mobile-safe-content max-w-3xl mx-auto p-4 space-y-6">
      <header className="flex items-center gap-3">
        <Disc3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Music Distribution</h1>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">New release</CardTitle></CardHeader>
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
                setTitle(""); setArtist("");
                toast({ title: "Release created" });
              } catch (e: any) {
                toast({ title: "Failed", description: e.message, variant: "destructive" });
              }
            }}
          >
            {createRelease.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create release
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

              {selectedRelease === r.id && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    {SUPPORTED_DSPS.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={chosen.includes(p)}
                          onCheckedChange={() => toggle(p)}
                        />
                        {p.replace("_", " ")}
                      </label>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    disabled={chosen.length === 0 || submit.isPending}
                    onClick={async () => {
                      try {
                        await submit.mutateAsync({ releaseId: r.id, platforms: chosen });
                        toast({ title: "Submitted to DSPs" });
                      } catch (e: any) {
                        toast({ title: "Failed", description: e.message, variant: "destructive" });
                      }
                    }}
                  >
                    {submit.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Submit / Update delivery
                  </Button>

                  {targets && targets.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {targets.map((t) => (
                        <DSPStatusBadge key={t.id} platform={t.platform} status={t.status} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
