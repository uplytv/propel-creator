import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Check, Copy, ExternalLink, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  usePresaveCampaign,
  usePresaveCampaignAnalytics,
  useUpsertPresaveCampaign,
} from "../hooks/usePresaveCampaign";
import PresaveDistributionWarning from "../components/PresaveDistributionWarning";

export default function PresaveCampaignSetupPage() {
  const { id: trackId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: existing, isLoading } = usePresaveCampaign(trackId);
  const upsert = useUpsertPresaveCampaign();
  const { data: analytics } = usePresaveCampaignAnalytics(existing?.id, existing?.release_at);

  const [track, setTrack] = useState<any>(null);
  const [confSpotify, setConfSpotify] = useState(false);
  const [confApple, setConfApple] = useState(false);
  const [releaseAt, setReleaseAt] = useState("");
  const [spotifyUri, setSpotifyUri] = useState("");
  const [appleAlbumId, setAppleAlbumId] = useState("");
  const [slug, setSlug] = useState("");
  const [coverArtUrl, setCoverArtUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!trackId) return;
    (async () => {
      const { data } = await supabase
        .from("tracks")
        .select("id, title, creator_id, cover_art_url")
        .eq("id", trackId)
        .maybeSingle();
      setTrack(data);
      if (data && !slug) {
        setSlug(
          (data.title ?? "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 60) || data.id.slice(0, 8)
        );
        if (!coverArtUrl) setCoverArtUrl(data.cover_art_url ?? "");
      }
    })();
  }, [trackId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!existing) return;
    setConfSpotify(existing.distribution_confirmed_spotify);
    setConfApple(existing.distribution_confirmed_apple);
    setReleaseAt(existing.release_at ? existing.release_at.slice(0, 16) : "");
    setSpotifyUri(existing.spotify_track_uri ?? "");
    setAppleAlbumId(existing.apple_album_id ?? "");
    setSlug(existing.campaign_url_slug ?? "");
    setCoverArtUrl(existing.cover_art_url ?? "");
    setDescription(existing.description ?? "");
  }, [existing]);

  const isOwner = useMemo(() => !!user && !!track && track.creator_id === user.id, [user, track]);
  const canActivate = (confSpotify || confApple) && !!releaseAt && !!slug;

  if (isLoading) return <div className="p-6 text-white/60">Loading…</div>;
  if (!track) return <div className="p-6 text-white/60">Track not found.</div>;
  if (!isOwner)
    return <div className="p-6 text-white/60">Only the track creator can manage this campaign.</div>;

  async function save(activate: boolean) {
    if (!trackId) return;
    if (activate && !canActivate) {
      toast.error("Confirm at least one distribution platform and set release date + slug.");
      return;
    }
    try {
      await upsert.mutateAsync({
        id: existing?.id,
        track_id: trackId,
        release_at: releaseAt ? new Date(releaseAt).toISOString() : new Date().toISOString(),
        spotify_track_uri: spotifyUri || null,
        apple_album_id: appleAlbumId || null,
        distribution_confirmed_spotify: confSpotify,
        distribution_confirmed_apple: confApple,
        campaign_url_slug: slug || null,
        cover_art_url: coverArtUrl || null,
        description: description || null,
        status: activate ? "active" : existing?.status === "released" ? "released" : "draft",
      });
      toast.success(activate ? "Campaign activated" : "Campaign saved as draft");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save campaign");
    }
  }

  const campaignUrl = slug ? `${window.location.origin}/presave/${slug}` : "";

  return (
    <div className="mobile-safe-content max-w-2xl mx-auto p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Pre-save campaign</h1>
        <p className="text-sm text-white/60 mt-1">{track.title}</p>
      </header>

      {/* Step 1 — Distribution */}
      <Card className="p-4 bg-white/[0.03] border-white/10 space-y-3">
        <div>
          <h2 className="text-white font-semibold">Before you start</h2>
          <p className="text-sm text-white/60 mt-1">
            UPLY doesn't distribute music. To run a pre-save campaign, your track must be submitted to
            Spotify/Apple via a distributor (DistroKid, TuneCore, CD Baby, etc.). The pre-save will fire
            when your track goes live on each platform.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={confSpotify} onCheckedChange={(v) => setConfSpotify(!!v)} />
          <span className="text-sm text-white">I've submitted this track to Spotify via my distributor</span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={confApple} onCheckedChange={(v) => setConfApple(!!v)} />
          <span className="text-sm text-white">I've submitted this track to Apple Music via my distributor</span>
        </label>
        <PresaveDistributionWarning spotifyConfirmed={confSpotify} appleConfirmed={confApple} />
      </Card>

      {/* Step 2 — Release */}
      <Card className="p-4 bg-white/[0.03] border-white/10 space-y-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Release date & time
        </h2>
        <Input
          type="datetime-local"
          value={releaseAt}
          onChange={(e) => setReleaseAt(e.target.value)}
        />
        <p className="text-xs text-white/50">
          Match your DSP release date. Check your distributor dashboard if unsure.
        </p>
      </Card>

      {/* Step 3 — Platform links */}
      <Card className="p-4 bg-white/[0.03] border-white/10 space-y-4">
        <h2 className="text-white font-semibold">Platform links</h2>

        <div className="space-y-2">
          <Label className={!confSpotify ? "text-white/30" : "text-white"}>Spotify track URI or URL</Label>
          <Input
            disabled={!confSpotify}
            placeholder="spotify:track:abc123 or https://open.spotify.com/track/abc123"
            value={spotifyUri}
            onChange={(e) => setSpotifyUri(e.target.value)}
          />
          <p className="text-xs text-white/50">
            Get this from your distributor or by searching Spotify after release. You can save the
            campaign now and add this later — just before the release date.
          </p>
        </div>

        <div className="space-y-2">
          <Label className={!confApple ? "text-white/30" : "text-white"}>Apple album ID</Label>
          <Input
            disabled={!confApple}
            placeholder="1234567890"
            value={appleAlbumId}
            onChange={(e) => setAppleAlbumId(e.target.value)}
          />
          <p className="text-xs text-white/50">
            Optional. Apple doesn't offer real auto-save — subscribers will get an email + Apple Wallet
            pass reminder regardless of this field.
          </p>
        </div>
      </Card>

      {/* Step 4 — Landing page */}
      <Card className="p-4 bg-white/[0.03] border-white/10 space-y-3">
        <h2 className="text-white font-semibold">Campaign landing page</h2>
        <div>
          <Label>URL slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} />
          {campaignUrl && (
            <p className="text-xs text-white/50 mt-1 break-all flex items-center gap-1">
              {campaignUrl}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(campaignUrl);
                  toast.success("Copied");
                }}
                className="ml-1"
              >
                <Copy className="h-3 w-3 inline" />
              </button>
            </p>
          )}
        </div>
        <div>
          <Label>Cover art URL</Label>
          <Input value={coverArtUrl} onChange={(e) => setCoverArtUrl(e.target.value)} />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </Card>

      {existing && analytics && (
        <Card className="p-4 bg-white/[0.03] border-white/10 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-white font-semibold">Campaign analytics</h2>
            <span className="text-xs text-white/50">{analytics.total} subscriber{analytics.total === 1 ? "" : "s"}</span>
          </div>

          <div>
            <div className="text-xs text-white/50 mb-2 uppercase tracking-wide">By platform</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Spotify", value: analytics.byPlatform.spotify },
                { label: "Apple Music", value: analytics.byPlatform.apple_music },
                { label: "Email only", value: analytics.byPlatform.email_only },
              ].map((p) => (
                <div key={p.label} className="rounded-md bg-white/[0.04] border border-white/10 p-2 text-center">
                  <div className="text-lg font-semibold text-white">{p.value}</div>
                  <div className="text-[11px] text-white/60">{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/50 mb-2 uppercase tracking-wide">Consent rates</div>
            <div className="space-y-1 text-sm text-white/80">
              <div className="flex justify-between">
                <span>Save track on release</span>
                <span className="text-white">
                  {analytics.consent.saveTrack} ({Math.round(analytics.consent.saveRate * 100)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Follow artist</span>
                <span className="text-white">
                  {analytics.consent.followArtist} ({Math.round(analytics.consent.followRate * 100)}%)
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-white/50 mb-2 uppercase tracking-wide">Release-day fulfillment</div>
            {(() => {
              const f = analytics.fulfillment;
              const released = existing.release_at && new Date(existing.release_at).getTime() <= Date.now();
              let status = "Awaiting release";
              let cls = "text-white/70";
              if (f.complete) { status = "Complete"; cls = "text-primary"; }
              else if (released && f.pending > 0) { status = "In progress"; cls = "text-yellow-400"; }
              else if (released && f.failed > 0 && f.pending === 0) { status = "Completed with errors"; cls = "text-orange-400"; }
              return (
                <>
                  <div className={`text-sm font-medium ${cls} mb-2`}>{status}</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-white/[0.04] border border-white/10 p-2">
                      <div className="text-lg font-semibold text-white">{f.fulfilled}</div>
                      <div className="text-[11px] text-white/60">Fulfilled</div>
                    </div>
                    <div className="rounded-md bg-white/[0.04] border border-white/10 p-2">
                      <div className="text-lg font-semibold text-white">{f.pending}</div>
                      <div className="text-[11px] text-white/60">Pending</div>
                    </div>
                    <div className="rounded-md bg-white/[0.04] border border-white/10 p-2">
                      <div className="text-lg font-semibold text-white">{f.failed}</div>
                      <div className="text-[11px] text-white/60">Failed</div>
                    </div>
                  </div>
                  {analytics.total > 0 && (
                    <div className="text-xs text-white/50 mt-2">
                      {Math.round(f.fulfillmentRate * 100)}% fulfilled
                      {f.lastFulfilledAt && ` · last at ${new Date(f.lastFulfilledAt).toLocaleString()}`}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => save(false)} disabled={upsert.isPending}>
          Save draft
        </Button>
        <Button onClick={() => save(true)} disabled={!canActivate || upsert.isPending}>
          {existing?.status === "active" ? "Update campaign" : "Activate campaign"}
        </Button>
      </div>

      {existing?.status === "active" && campaignUrl && (
        <Card className="p-4 bg-primary/10 border-primary/30 space-y-2">
          <div className="text-white font-semibold flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" /> Campaign is live
          </div>
          <a
            href={campaignUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary flex items-center gap-1"
          >
            {campaignUrl} <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex gap-2 pt-2">
            {[
              { label: "X", url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(campaignUrl)}&text=${encodeURIComponent(`Pre-save ${track.title}`)}` },
              { label: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}` },
            ].map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">{s.label}</Button>
              </a>
            ))}
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(campaignUrl); toast.success("Copied"); }}>
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
