import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GripVertical, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface LiveProductForm {
  title: string;
  description: string;
  price: number;
  type: "sell" | "auction";
  quantity: number;
  auction_duration: number;
  image_url: string | null;
}

interface Props {
  streamId: string;
  products: any[];
  onProductsChange: () => void;
}

const DURATIONS = [1, 2, 3, 5, 10];

export default function LiveShopSetup({ streamId, products, onProductsChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LiveProductForm>({
    title: "", description: "", price: 10, type: "sell",
    quantity: 1, auction_duration: 5, image_url: null,
  });

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/shop-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("covers").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("live_products").insert({
      stream_id: streamId,
      creator_id: user.id,
      title: form.title,
      description: form.description || null,
      image_url: form.image_url,
      price: form.type === "auction" ? 0 : form.price,
      starting_bid: form.type === "auction" ? form.price : 0,
      quantity_total: form.quantity,
      quantity_remaining: form.quantity,
      type: form.type,
      auction_duration_minutes: form.type === "auction" ? form.auction_duration : null,
      position: products.length,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product added!", description: `${form.title} added to your shop.` });
      setForm({ title: "", description: "", price: 10, type: "sell", quantity: 1, auction_duration: 5, image_url: null });
      setShowForm(false);
      onProductsChange();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("live_products").delete().eq("id", id);
    onProductsChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Shop Products ({products.length}/20)</h3>
        {products.length < 20 && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 space-y-3">
              {/* Image */}
              <div>
                {form.image_url ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, image_url: null }))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white">
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                    {uploading ? <span className="text-xs text-muted-foreground">...</span> : <Image className="w-5 h-5 text-muted-foreground" />}
                  </label>
                )}
              </div>

              {/* Title */}
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Product title"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />

              {/* Description */}
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />

              {/* Type toggle */}
              <div className="flex gap-2">
                {(["sell", "auction"] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      form.type === t ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border"
                    }`}>
                    {t === "sell" ? "Sell Now" : "Auction"}
                  </button>
                ))}
              </div>

              {/* Price / Starting Bid */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {form.type === "auction" ? "Starting Bid" : "Price"}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input type="number" min={0} value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                  <input type="number" min={1} value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              {/* Auction duration */}
              {form.type === "auction" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
                  <div className="flex gap-2">
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => setForm(f => ({ ...f, auction_duration: d }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          form.auction_duration === d ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border"
                        }`}>
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleAdd} disabled={!form.title.trim() || saving} className="w-full">
                {saving ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product list */}
      <div className="space-y-2">
        {products.map((p, i) => (
          <div key={p.id} className="glass-card p-3 flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab" />
            {p.image_url ? (
              <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-lg">🛍️</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  p.type === "auction" ? "bg-amber-500/10 text-amber-400" : "bg-primary/10 text-primary"
                }`}>{p.type}</span>
                <span className="text-xs text-muted-foreground">
                  {p.type === "auction" ? `Starting $${p.starting_bid}` : `$${p.price}`} · Qty: {p.quantity_total}
                </span>
              </div>
            </div>
            <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {products.length === 0 && !showForm && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No products added yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add products to sell or auction during your stream.</p>
        </div>
      )}
    </div>
  );
}
