import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  useLiveStemListings,
  useMyStemListings,
  useCreateStemListing,
  usePurchaseStem,
} from "../hooks/useStemMarketplace";
import { StemListingCard } from "../components/StemListingCard";
import { toast } from "sonner";

export default function StemMarketplacePage() {
  const live = useLiveStemListings();
  const mine = useMyStemListings();
  const create = useCreateStemListing();
  const purchase = usePurchaseStem();

  const [form, setForm] = useState({
    title: "",
    description: "",
    genre: "",
    bpm: 120,
    musical_key: "",
    preview_url: "",
    price_cents: 1500,
    license_type: "non_exclusive",
  });

  const submit = async () => {
    if (!form.title) return toast.error("Title required");
    try {
      await create.mutateAsync(form);
      toast.success("Stem listing created");
      setForm({ ...form, title: "", description: "", preview_url: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="container mx-auto p-4 mobile-safe-content">
      <h1 className="text-2xl font-bold mb-1">Stem Marketplace</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Sell isolated stems for remixing and sampling.
      </p>
      <Tabs defaultValue="browse">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="mine">Mine</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="grid gap-3 mt-4 md:grid-cols-2">
          {live.data?.map((l) => (
            <StemListingCard
              key={l.id}
              listing={l}
              onBuy={async () => {
                try {
                  await purchase.mutateAsync(l);
                  toast.success("Purchased — check your library");
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            />
          ))}
          {live.data?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">
              No stem listings yet
            </p>
          )}
        </TabsContent>

        <TabsContent value="mine" className="grid gap-3 mt-4 md:grid-cols-2">
          {mine.data?.map((l) => <StemListingCard key={l.id} listing={l} />)}
          {mine.data?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">
              You haven't listed any stems
            </p>
          )}
        </TabsContent>

        <TabsContent value="sell">
          <Card className="p-4 space-y-3 mt-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Genre</Label>
                <Input
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                />
              </div>
              <div>
                <Label>BPM</Label>
                <Input
                  type="number"
                  value={form.bpm}
                  onChange={(e) => setForm({ ...form, bpm: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Key</Label>
                <Input
                  value={form.musical_key}
                  onChange={(e) => setForm({ ...form, musical_key: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Preview URL</Label>
              <Input
                value={form.preview_url}
                onChange={(e) => setForm({ ...form, preview_url: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Price (cents)</Label>
                <Input
                  type="number"
                  value={form.price_cents}
                  onChange={(e) =>
                    setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>License</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.license_type}
                  onChange={(e) => setForm({ ...form, license_type: e.target.value })}
                >
                  <option value="non_exclusive">Non-exclusive</option>
                  <option value="exclusive">Exclusive</option>
                  <option value="royalty_free">Royalty-free</option>
                </select>
              </div>
            </div>
            <Button onClick={submit} disabled={create.isPending} className="w-full">
              {create.isPending ? "Creating..." : "List stems"}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
