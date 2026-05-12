import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  useSyncListings,
  useSyncBriefs,
  useCreateSyncListing,
  useCreateSyncBrief,
  useSubmitPitch,
} from "../hooks/useSyncLicensing";
import { SyncListingCard } from "../components/SyncListingCard";
import { SyncBriefCard } from "../components/SyncBriefCard";

export default function SyncLicensingPage() {
  const { data: listings = [] } = useSyncListings();
  const { data: briefs = [] } = useSyncBriefs();
  const createListing = useCreateSyncListing();
  const createBrief = useCreateSyncBrief();
  const submitPitch = useSubmitPitch();

  const [listing, setListing] = useState({ title: "", artist_name: "", description: "" });
  const [brief, setBrief] = useState({ project_name: "", project_type: "film", description: "" });
  const [pitchBriefId, setPitchBriefId] = useState<string | null>(null);
  const [pitchMessage, setPitchMessage] = useState("");

  return (
    <div className="mobile-safe-content max-w-3xl mx-auto p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Sync Licensing</h1>
        <p className="text-sm text-muted-foreground">Pitch tracks for film, TV, and ads</p>
      </header>

      <Tabs defaultValue="listings">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="listings">Tracks</TabsTrigger>
          <TabsTrigger value="briefs">Briefs</TabsTrigger>
          <TabsTrigger value="pitch-track">Pitch</TabsTrigger>
          <TabsTrigger value="post-brief">Post</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-3 mt-3">
          {listings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No tracks listed yet.</p>
          )}
          {listings.map((l) => <SyncListingCard key={l.id} listing={l} />)}
        </TabsContent>

        <TabsContent value="briefs" className="space-y-3 mt-3">
          {briefs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No open briefs right now.</p>
          )}
          {briefs.map((b) => (
            <SyncBriefCard key={b.id} brief={b} onClick={() => setPitchBriefId(b.id)} />
          ))}
          {pitchBriefId && (
            <Card className="p-4 space-y-2">
              <h3 className="font-semibold">Submit pitch</h3>
              <Textarea
                placeholder="Why is your track right for this brief?"
                value={pitchMessage}
                onChange={(e) => setPitchMessage(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    await submitPitch.mutateAsync({ brief_id: pitchBriefId, message: pitchMessage });
                    toast({ title: "Pitch submitted" });
                    setPitchBriefId(null);
                    setPitchMessage("");
                  }}
                >
                  Send pitch
                </Button>
                <Button variant="ghost" onClick={() => setPitchBriefId(null)}>Cancel</Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pitch-track" className="mt-3">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">List a track for sync</h3>
            <Input
              placeholder="Track title"
              value={listing.title}
              onChange={(e) => setListing({ ...listing, title: e.target.value })}
            />
            <Input
              placeholder="Artist name"
              value={listing.artist_name}
              onChange={(e) => setListing({ ...listing, artist_name: e.target.value })}
            />
            <Textarea
              placeholder="Vibe, instrumentation, suggested use cases..."
              value={listing.description}
              onChange={(e) => setListing({ ...listing, description: e.target.value })}
            />
            <Button
              onClick={async () => {
                if (!listing.title || !listing.artist_name) return;
                await createListing.mutateAsync(listing);
                toast({ title: "Track listed" });
                setListing({ title: "", artist_name: "", description: "" });
              }}
            >
              List for sync
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="post-brief" className="mt-3">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Post a sync brief</h3>
            <Input
              placeholder="Project name"
              value={brief.project_name}
              onChange={(e) => setBrief({ ...brief, project_name: e.target.value })}
            />
            <select
              className="w-full bg-background border border-border rounded-md p-2 text-base"
              value={brief.project_type}
              onChange={(e) => setBrief({ ...brief, project_type: e.target.value })}
            >
              <option value="film">Film</option>
              <option value="tv">TV</option>
              <option value="ad">Ad / Commercial</option>
              <option value="game">Video Game</option>
              <option value="trailer">Trailer</option>
            </select>
            <Textarea
              placeholder="Describe scene, mood, references..."
              value={brief.description}
              onChange={(e) => setBrief({ ...brief, description: e.target.value })}
            />
            <Button
              onClick={async () => {
                if (!brief.project_name) return;
                await createBrief.mutateAsync(brief);
                toast({ title: "Brief posted" });
                setBrief({ project_name: "", project_type: "film", description: "" });
              }}
            >
              Post brief
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
