import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLiveCampaigns, useMyCampaigns, useCreateCampaign } from "../hooks/useCrowdfund";
import { CampaignCard } from "../components/CampaignCard";

export default function CrowdfundPage() {
  const live = useLiveCampaigns();
  const mine = useMyCampaigns();
  const create = useCreateCampaign();

  const [form, setForm] = useState({
    title: "",
    description: "",
    cover_url: "",
    kind: "album",
    goal_cents: 500000,
  });

  return (
    <div className="container max-w-5xl py-6 space-y-6 mobile-safe-content">
      <header>
        <h1 className="text-2xl font-bold">Fan Crowdfunding</h1>
        <p className="text-sm text-muted-foreground">Back upcoming albums, tours, and music projects</p>
      </header>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live campaigns</TabsTrigger>
          <TabsTrigger value="mine">My campaigns</TabsTrigger>
          <TabsTrigger value="create">Launch</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          {live.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !live.data?.length ? (
            <p className="text-sm text-muted-foreground">No live campaigns yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {live.data.map((c) => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {mine.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !mine.data?.length ? (
            <p className="text-sm text-muted-foreground">You haven't launched a campaign yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mine.data.map((c) => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <Card className="p-4 space-y-3 max-w-xl">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Cover image URL</Label>
              <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Kind</Label>
                <Input value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} placeholder="album / tour / single" />
              </div>
              <div>
                <Label>Goal (cents)</Label>
                <Input type="number" value={form.goal_cents} onChange={(e) => setForm({ ...form, goal_cents: +e.target.value })} />
              </div>
            </div>
            <Button onClick={() => create.mutate({ ...form, status: "live" })} disabled={!form.title || create.isPending}>
              {create.isPending ? "Launching…" : "Launch campaign"}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
