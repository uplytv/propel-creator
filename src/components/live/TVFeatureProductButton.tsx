import { useState } from "react";
import { Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";

interface Props {
  streamId: string;
}

/**
 * Creator control: feature a product on UPLY TV viewers' screens with a
 * scannable QR code. Calls the tv-feature-product edge function which
 * mints a signed 30-min token and inserts a tv_product_features row.
 */
export default function TVFeatureProductButton({ streamId }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: products } = useProducts();
  const active = (products || []).filter((p: any) => p.status === "active");

  const featureIt = async (productId: string) => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("tv-feature-product", {
      body: { stream_id: streamId, product_id: productId },
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't feature on TV", { description: error.message });
    } else {
      toast.success("Featured on TV — QR is now live");
      setOpen(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
        <Tv className="w-4 h-4" /> Feature on TV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Feature a product on TV</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Shows for 30 minutes on TV viewers' screens with a scannable QR.
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto mt-2">
            {active.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No active products.</p>
            )}
            {active.map((p: any) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => featureIt(p.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition text-left disabled:opacity-50"
              >
                {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="w-12 h-12 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">${Number(p.price).toFixed(2)}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
