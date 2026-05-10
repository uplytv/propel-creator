import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useLiveMerchBundles, useMyMerchBundles, useCreateBundle } from "../hooks/useMerchBundles";
import { MerchBundleCard } from "../components/MerchBundleCard";
import { toast } from "sonner";

export default function MerchBundlesPage() {
  const live = useLiveMerchBundles();
  const mine = useMyMerchBundles();
  const create = useCreateBundle();

  const [form, setForm] = useState({
    title: "",
    description: "",
    image_url: "",
    price_cents: 2500,
    bundle_type: "release",
    inventory_count: 100,
  });

  const submit = async () => {
    if (!form.title) return toast.error("Title required");
    try {
      await create.mutateAsync(form);
      toast.success("Bundle created");
      setForm({ ...form, title: "", description: "", image_url: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="container mx-auto p-4 mobile-safe-content">
      <h1 className="text-2xl font-bold mb-4">Merch Bundles</h1>
      <Tabs defaultValue="live">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="mine">Mine</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {live.data?.map((b) => <MerchBundleCard key={b.id} bundle={b} />)}
          {live.data?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">No live bundles</p>
          )}
        </TabsContent>

        <TabsContent value="mine" className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {mine.data?.map((b) => <MerchBundleCard key={b.id} bundle={b} />)}
          {mine.data?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">No bundles yet</p>
          )}
        </TabsContent>

        <TabsContent value="create">
          <Card className="p-4 space-y-3 mt-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Price (cents)</Label>
                <Input
                  type="number"
                  value={form.price_cents}
                  onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.bundle_type}
                  onChange={(e) => setForm({ ...form, bundle_type: e.target.value })}
                >
                  <option value="release">Release</option>
                  <option value="tour">Tour</option>
                  <option value="limited">Limited</option>
                </select>
              </div>
              <div>
                <Label>Inventory</Label>
                <Input
                  type="number"
                  value={form.inventory_count}
                  onChange={(e) => setForm({ ...form, inventory_count: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <Button onClick={submit} disabled={create.isPending} className="w-full">
              {create.isPending ? "Creating..." : "Create Bundle"}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
