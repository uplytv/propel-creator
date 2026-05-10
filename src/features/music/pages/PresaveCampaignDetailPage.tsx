import { useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, Users, Disc3, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  useCancelPresave,
  useMyPresaveSignup,
  usePresave,
  usePresaveCampaign,
  type PresavePlatform,
} from "../hooks/usePresaveCampaigns";

const PLATFORM_LABELS: Record<PresavePlatform, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  tidal: "Tidal",
};

export default function PresaveCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = usePresaveCampaign(id);
  const { data: mine } = useMyPresaveSignup(id);
  const presave = usePresave();
  const cancel = useCancelPresave();
  const [email, setEmail] = useState("");
  const [platforms, setPlatforms] = useState<PresavePlatform[]>([]);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  if (!campaign) return <div className="p-4 text-sm text-muted-foreground">Campaign not found.</div>;

  const release = new Date(campaign.release_date);
  const released = campaign.status === "released";
  const links: { key: PresavePlatform; url: string | null }[] = [
    { key: "spotify", url: campaign.spotify_url },
    { key: "apple", url: campaign.apple_url },
    { key: "tidal", url: campaign.tidal_url },
  ];

  const togglePlatform = (p: PresavePlatform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  return (
    <div className="mobile-safe-content p-4 space-y-4 max-w-xl mx-auto">
      {campaign.artwork_url ? (
        <img
          src={campaign.artwork_url}
          alt={campaign.release_title}
          className="w-full aspect-square object-cover rounded-2xl"
        />
      ) : (
        <div className="w-full aspect-square rounded-2xl bg-muted flex items-center justify-center">
          <Disc3 className="h-16 w-16 text-muted-foreground" />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{campaign.release_title}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {release.toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {campaign.presave_count} pre-saved
          </span>
        </div>
        {campaign.description && (
          <p className="text-sm whitespace-pre-line mt-2">{campaign.description}</p>
        )}
      </div>

      {released ? (
        <div className="space-y-2">
          {links
            .filter((l) => l.url)
            .map((l) => (
              <a
                key={l.key}
                href={l.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between min-h-[44px] rounded-xl border border-border bg-card/40 px-4"
              >
                <span className="font-semibold">Listen on {PLATFORM_LABELS[l.key]}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
        </div>
      ) : mine ? (
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <p className="text-sm flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            You're pre-saved
            {mine.platforms.length > 0 && (
              <> for {mine.platforms.map((p) => PLATFORM_LABELS[p]).join(", ")}</>
            )}.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              cancel.mutate(campaign.id, {
                onSuccess: () => toast({ title: "Pre-save canceled" }),
              })
            }
            disabled={cancel.isPending}
          >
            Cancel pre-save
          </Button>
        </div>
      ) : (
        <form
          className="rounded-xl border border-border bg-card/40 p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            presave.mutate(
              { campaign_id: campaign.id, email: email || undefined, platforms },
              {
                onSuccess: () => {
                  toast({ title: "You're pre-saved!" });
                  setEmail("");
                  setPlatforms([]);
                },
                onError: (err: any) =>
                  toast({ title: "Could not pre-save", description: err.message, variant: "destructive" }),
              },
            );
          }}
        >
          <div className="space-y-1">
            <Label>Where will you listen?</Label>
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => togglePlatform(l.key)}
                  className={`min-h-[44px] px-3 rounded-lg border text-sm font-semibold ${
                    platforms.includes(l.key)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card/40"
                  }`}
                >
                  {PLATFORM_LABELS[l.key]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ps-email">Notification email (optional)</Label>
            <Input
              id="ps-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={presave.isPending}>
            {presave.isPending ? "Saving..." : "Pre-save release"}
          </Button>
        </form>
      )}
    </div>
  );
}
