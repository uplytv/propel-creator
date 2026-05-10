import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Disc3 } from "lucide-react";
import { toast } from "sonner";
import { usePreorderCampaign, useCreatePreorder } from "../hooks/usePreorders";
import { useAuth } from "@/context/AuthContext";

export default function PreorderCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = usePreorderCampaign(id);
  const create = useCreatePreorder();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("US");

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!campaign) return <div className="p-6 text-muted-foreground">Campaign not found.</div>;

  const pct = Math.min(100, Math.round((campaign.units_reserved / Math.max(1, campaign.goal_units)) * 100));
  const total = (campaign.price_cents * qty) / 100;

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to preorder.");
      return;
    }
    try {
      await create.mutateAsync({
        campaign_id: campaign.id,
        quantity: qty,
        amount_cents: campaign.price_cents * qty,
        currency: campaign.currency,
        shipping_name: name,
        shipping_address: { line1, city, postal_code: postal, country },
      });
      toast.success("Preorder placed!");
      setQty(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to preorder");
    }
  };

  return (
    <div className="container max-w-4xl py-6 mobile-safe-content space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
          {campaign.cover_url ? (
            <img src={campaign.cover_url} alt={campaign.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-20 h-20 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{campaign.format.replace("_", " ")}</Badge>
            <Badge variant="outline" className="capitalize">{campaign.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          {campaign.description && <p className="text-muted-foreground">{campaign.description}</p>}
          <div className="space-y-2">
            <Progress value={pct} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{campaign.units_reserved}/{campaign.goal_units} reserved ({pct}%)</span>
              <span className="font-semibold text-foreground">${(campaign.price_cents / 100).toFixed(2)}</span>
            </div>
          </div>
          {campaign.ships_by && (
            <p className="text-sm text-muted-foreground">Ships by {new Date(campaign.ships_by).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Reserve your copy</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Quantity</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="123 Main St" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label>Postal code</Label>
            <Input value={postal} onChange={(e) => setPostal(e.target.value)} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-bold">Total: ${total.toFixed(2)}</span>
          <Button onClick={submit} disabled={create.isPending || campaign.status !== "active"}>
            {create.isPending ? "Reserving…" : "Reserve preorder"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
