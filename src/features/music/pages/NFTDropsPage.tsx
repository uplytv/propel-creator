import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLiveNFTDrops, useMyNFTDrops, useCreateNFTDrop, useMintEdition } from "../hooks/useNFTDrops";
import { NFTDropCard } from "../components/NFTDropCard";

export default function NFTDropsPage() {
  const live = useLiveNFTDrops();
  const mine = useMyNFTDrops();
  const create = useCreateNFTDrop();
  const mint = useMintEdition();

  const [form, setForm] = useState({
    title: "",
    description: "",
    artwork_url: "",
    edition_size: 100,
    price_cents: 500,
    chain: "base",
  });

  return (
    <div className="container max-w-5xl py-6 space-y-6 mobile-safe-content">
      <header>
        <h1 className="text-2xl font-bold">Music NFT Drops</h1>
        <p className="text-sm text-muted-foreground">Limited-edition collectible track drops on-chain</p>
      </header>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live drops</TabsTrigger>
          <TabsTrigger value="mine">My drops</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          {live.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !live.data?.length ? (
            <p className="text-sm text-muted-foreground">No live drops yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {live.data.map((d) => (
                <NFTDropCard key={d.id} drop={d} onMint={(drop) => mint.mutate({ drop })} minting={mint.isPending} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {mine.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !mine.data?.length ? (
            <p className="text-sm text-muted-foreground">You haven't created any drops.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mine.data.map((d) => (
                <NFTDropCard key={d.id} drop={d} />
              ))}
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
              <Label>Artwork URL</Label>
              <Input value={form.artwork_url} onChange={(e) => setForm({ ...form, artwork_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Editions</Label>
                <Input type="number" value={form.edition_size} onChange={(e) => setForm({ ...form, edition_size: +e.target.value })} />
              </div>
              <div>
                <Label>Price (cents)</Label>
                <Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: +e.target.value })} />
              </div>
              <div>
                <Label>Chain</Label>
                <Input value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} />
              </div>
            </div>
            <Button
              onClick={() => create.mutate({ ...form, status: "live" })}
              disabled={!form.title || create.isPending}
            >
              {create.isPending ? "Creating…" : "Launch drop"}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
