import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Image, Zap, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLiveShop } from "@/hooks/useLiveShop";

const CATEGORIES = ["Clothing", "Electronics", "Collectibles", "Sports Cards", "Sneakers", "Jewelry", "Art", "Books", "Toys", "Beauty", "Home", "Other"];
const CONDITIONS = ["new", "like_new", "good", "fair"];
const FLASH_DISCOUNTS = [10, 15, 20, 25, 30, 50];
const FLASH_DURATIONS = [30, 60, 120, 300];

interface Props {
  streamId: string;
  products: any[];
  onProductsChange: () => void;
  isStreamActive?: boolean;
  onGoToStreamSetup?: () => void;
}

export default function LiveShopSetup({ streamId, products, onProductsChange, isStreamActive = false, onGoToStreamSetup }: Props) {
  const { user } = useAuth();
  const { activateProduct, deactivateProduct, startFlashSale, auctions } = useLiveShop(streamId);
  const [tab, setTab] = useState<"products" | "shopify" | "flash">("products");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shopifyStore, setShopifyStore] = useState<any>(null);
  const [shopifyProducts, setShopifyProducts] = useState<any[]>([]);
  const [shopifyLoading, setShopifyLoading] = useState(false);
  const [shopifyConnecting, setShopifyConnecting] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [selectedShopifyItems, setSelectedShopifyItems] = useState<Set<string>>(new Set());
  const [flashProductId, setFlashProductId] = useState("");
  const [flashDiscount, setFlashDiscount] = useState(20);
  const [flashDuration, setFlashDuration] = useState(60);
  const [form, setForm] = useState({
    title: "", description: "", price: 10, type: "sell" as "sell" | "auction",
    quantity: 1, auction_duration: 5, reserve_price: 0, buy_now_price: 0,
    image_url: null as string | null, additional_images: [] as string[],
    shipping_price: 0, free_shipping: false,
    condition: "new", category: "Other", sku: "",
    variants: [] as { label: string; options: string }[],
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("creator_shopify_stores")
      .select("*")
      .eq("creator_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => { if (data) setShopifyStore(data); });
  }, [user]);

  const uploadImage = async (file: File, isAdditional = false) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/shop-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("covers").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("covers").getPublicUrl(path);
    if (isAdditional) {
      setForm(f => ({ ...f, additional_images: [...f.additional_images, publicUrl].slice(0, 3) }));
    } else {
      setForm(f => ({ ...f, image_url: publicUrl }));
    }
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !user) return;
    setSaving(true);
    const { data: newProd, error } = await supabase.from("live_products").insert({
      stream_id: streamId, creator_id: user.id,
      title: form.title, description: form.description || null,
      image_url: form.image_url, additional_images: form.additional_images,
      price: form.type === "auction" ? 0 : form.price,
      starting_bid: form.type === "auction" ? form.price : 0,
      reserve_price: form.type === "auction" && form.reserve_price > 0 ? form.reserve_price : null,
      buy_now_price: form.type === "auction" && form.buy_now_price > 0 ? form.buy_now_price : null,
      quantity_total: form.quantity, quantity_remaining: form.quantity,
      type: form.type, auction_duration_minutes: form.type === "auction" ? form.auction_duration : null,
      auto_end_auction: true,
      shipping_price: form.free_shipping ? 0 : form.shipping_price,
      free_shipping: form.free_shipping,
      condition: form.condition, category: form.category, sku: form.sku || null,
      position: products.length,
    } as any).select().single();

    if (error) {
      toast.error(error.message);
    } else {
      // Save variants
      for (const v of form.variants) {
        if (v.label && v.options) {
          const opts = v.options.split(",").map(o => o.trim()).filter(Boolean);
          if (opts.length) {
            await supabase.from("live_product_variants").insert({
              live_product_id: (newProd as any).id, label: v.label, options: opts,
            } as any);
          }
        }
      }
      // AI pitch generation — competitive advantage
      supabase.functions.invoke("aria-chat", {
        body: {
          message: `Write a punchy 1-sentence live shopping pitch under 15 words for: "${form.title}", $${form.price}${form.description ? `, ${form.description.slice(0, 80)}` : ""}. Make it urgent and exciting.`,
          creator_id: user.id,
        },
      }).then(({ data: aiData }) => {
        const pitch = aiData?.content?.[0]?.text || aiData?.message || "";
        if (pitch && (newProd as any).id) {
          supabase.from("live_products")
            .update({ ai_pitch: pitch.slice(0, 200) })
            .eq("id", (newProd as any).id)
            .then(() => {});
        }
      }).catch(() => {});

      toast.success("Product added to queue!");
      setForm({
        title: "", description: "", price: 10, type: "sell", quantity: 1, auction_duration: 5,
        reserve_price: 0, buy_now_price: 0, image_url: null, additional_images: [],
        shipping_price: 0, free_shipping: false, condition: "new", category: "Other", sku: "",
        variants: [],
      });
      setShowForm(false);
      onProductsChange();
    }
    setSaving(false);
  };

  const connectShopify = async () => {
    if (!shopDomain || !accessToken) return;
    setShopifyConnecting(true);
    const { data, error } = await supabase.functions.invoke("shopify-sync-products", {
      body: { action: "connect", shop_domain: shopDomain, access_token: accessToken },
    });
    if (error || !data?.success) {
      toast.error("Connection failed", { description: data?.error || "Check your credentials" });
    } else {
      toast.success(`Connected to ${data.shop_name}`);
      setShopifyStore({ shop_name: data.shop_name });
      loadShopifyProducts();
    }
    setShopifyConnecting(false);
  };

  const loadShopifyProducts = async () => {
    setShopifyLoading(true);
    const { data } = await supabase.functions.invoke("shopify-sync-products", { body: { action: "fetch_products" } });
    setShopifyProducts(data?.products || []);
    setShopifyLoading(false);
  };

  const importSelected = async () => {
    if (!selectedShopifyItems.size) return;
    const items = Array.from(selectedShopifyItems).map(k => {
      const [product_id, variant_id] = k.split(":");
      return { product_id, variant_id };
    });
    const { data } = await supabase.functions.invoke("shopify-sync-products", {
      body: { action: "import_to_stream", stream_id: streamId, product_ids: items },
    });
    toast.success(`Imported ${data?.imported || 0} products from Shopify`);
    setSelectedShopifyItems(new Set());
    onProductsChange();
  };

  const active = products.filter((p: any) => p.is_active && !p.is_sold_out);
  const queued = products.filter((p: any) => !p.is_active && !p.is_sold_out);

  return (
    <div className="space-y-3 mobile-safe-content">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 border border-border">
        {([
          { id: "products", icon: ShoppingBag, label: "Products" },
          { id: "shopify", icon: Package, label: "Shopify" },
          { id: "flash", icon: Zap, label: "Flash Sale" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {products.length}/20 · {active.length} live
            </span>
            {products.length < 20 && (
              <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Product
              </Button>
            )}
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="rounded-xl p-4 space-y-3 bg-card border border-border">
                  {/* Images */}
                  <div className="flex gap-2">
                    <label className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 shrink-0">
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                      {form.image_url
                        ? <img src={form.image_url} alt="" loading="lazy" className="w-full h-full rounded-lg object-cover" />
                        : uploading ? <span className="text-[10px] text-muted-foreground">…</span>
                        : <Image className="w-4 h-4 text-muted-foreground" />}
                    </label>
                    {[0, 1, 2].map(i => (
                      <label key={i} className="w-10 h-10 rounded-lg border border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:border-primary/30 shrink-0">
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], true)} />
                        {form.additional_images[i]
                          ? <img src={form.additional_images[i]} alt="" loading="lazy" className="w-full h-full rounded-lg object-cover" />
                          : <Plus className="w-3 h-3 text-muted-foreground/40" />}
                      </label>
                    ))}
                  </div>

                  {/* Title + SKU */}
                  <div className="grid grid-cols-3 gap-2">
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Title *" style={{ fontSize: 16 }}
                      className="col-span-2 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                    <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                      placeholder="SKU" style={{ fontSize: 16 }}
                      className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                  </div>

                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description (optional)" rows={2} style={{ fontSize: 16 }}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none" />

                  {/* Category + Condition */}
                  <div className="grid grid-cols-2 gap-2">
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      style={{ fontSize: 16 }} className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                      style={{ fontSize: 16 }} className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                      {CONDITIONS.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>

                  {/* Sell / Auction toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    {(["sell", "auction"] as const).map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                          form.type === t ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border"
                        }`}>
                        {t === "sell" ? "🛒 Sell Now" : "🔨 Auction"}
                      </button>
                    ))}
                  </div>

                  {/* Price + Qty */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        {form.type === "auction" ? "Starting Bid" : "Price"} *
                      </label>
                      <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-lg px-3 py-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input type="number" min={0} value={form.price} style={{ fontSize: 16 }}
                          onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Quantity</label>
                      <input type="number" min={1} value={form.quantity} style={{ fontSize: 16 }}
                        onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                        className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                    </div>
                  </div>

                  {/* Auction extras */}
                  {form.type === "auction" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Reserve Price</label>
                          <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-lg px-3 py-2">
                            <span className="text-sm text-muted-foreground">$</span>
                            <input type="number" min={0} value={form.reserve_price} style={{ fontSize: 16 }}
                              onChange={e => setForm(f => ({ ...f, reserve_price: parseFloat(e.target.value) || 0 }))}
                              className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Buy Now Price</label>
                          <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-lg px-3 py-2">
                            <span className="text-sm text-muted-foreground">$</span>
                            <input type="number" min={0} value={form.buy_now_price} style={{ fontSize: 16 }}
                              onChange={e => setForm(f => ({ ...f, buy_now_price: parseFloat(e.target.value) || 0 }))}
                              className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 5, 10].map(d => (
                          <button key={d} onClick={() => setForm(f => ({ ...f, auction_duration: d }))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              form.auction_duration === d ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border"
                            }`}>{d}m</button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Shipping */}
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Shipping</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {[true, false].map(free => (
                        <button key={String(free)} onClick={() => setForm(f => ({ ...f, free_shipping: free }))}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                            form.free_shipping === free ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border"
                          }`}>
                          {free ? "Free Shipping" : "Paid Shipping"}
                        </button>
                      ))}
                    </div>
                    {!form.free_shipping && (
                      <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-lg px-3 py-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input type="number" min={0} step={0.01} value={form.shipping_price} style={{ fontSize: 16 }}
                          onChange={e => setForm(f => ({ ...f, shipping_price: parseFloat(e.target.value) || 0 }))}
                          placeholder="Shipping cost"
                          className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
                      </div>
                    )}
                  </div>

                  {/* Variants */}
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">
                      Variants (optional — e.g. Size: S, M, L)
                    </label>
                    {form.variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                        <input value={v.label} placeholder="Label" style={{ fontSize: 16 }}
                          onChange={e => setForm(f => { const vs = [...f.variants]; vs[i] = { ...vs[i], label: e.target.value }; return { ...f, variants: vs }; })}
                          className="col-span-2 bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                        <input value={v.options} placeholder="S, M, L, XL" style={{ fontSize: 16 }}
                          onChange={e => setForm(f => { const vs = [...f.variants]; vs[i] = { ...vs[i], options: e.target.value }; return { ...f, variants: vs }; })}
                          className="col-span-2 bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                        <button onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))}
                          className="text-destructive/60 hover:text-destructive text-xs">✕</button>
                      </div>
                    ))}
                    {form.variants.length < 3 && (
                      <button onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { label: "", options: "" }] }))}
                        className="text-xs text-primary hover:text-primary/80">
                        + Add variant
                      </button>
                    )}
                  </div>

                  <Button onClick={handleAdd} disabled={!form.title.trim() || saving} className="w-full">
                    {saving ? "Adding…" : "Add to Queue"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active products */}
          {active.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">🔴 Live Now</p>
              {active.map((p: any) => {
                const auction = (auctions as any[]).find((a: any) => a.live_product_id === p.id && a.status === "active");
                return (
                  <div key={p.id} className="rounded-xl p-3 mb-2 border border-primary/30 bg-primary/5 flex items-center gap-3">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.title} className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
                      : <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">🛍️</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.type === "auction" ? `Auction · $${auction?.current_bid || p.starting_bid}` : `$${p.price}`}
                        {" · "}{p.quantity_remaining} left
                      </p>
                    </div>
                    <button onClick={() => deactivateProduct(p.id)}
                      className="px-2.5 py-1 rounded-lg bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground">
                      Stop
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Queued products */}
          {queued.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Queue ({queued.length})
              </p>
              {queued.map((p: any) => (
                <div key={p.id} className="rounded-xl p-3 mb-2 border border-border bg-card flex items-center gap-3">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
                    : <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm shrink-0">🛍️</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.type === "auction" ? "Auction" : `$${p.price}`}
                      {p.shopify_product_id ? " · Shopify" : ""}
                      {p.ai_pitch ? " · ✨ AI pitch ready" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isStreamActive ? (
                      <button
                        onClick={() => activateProduct(p.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground"
                      >
                        Go Live
                      </button>
                    ) : (
                      <button
                        onClick={() => onGoToStreamSetup?.()}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all"
                      >
                        → Set Up Stream
                      </button>
                    )}
                    <button onClick={async () => { await supabase.from("live_products").delete().eq("id", p.id); onProductsChange(); }}
                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      aria-label="Delete product">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {products.length === 0 && !showForm && (
            <div className="text-center py-10">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Add products to sell live</p>
              <p className="text-xs text-muted-foreground mt-0.5">or import from Shopify →</p>
            </div>
          )}
        </div>
      )}

      {/* ── SHOPIFY TAB ── */}
      {tab === "shopify" && (
        <div className="space-y-3">
          {!shopifyStore ? (
            <div className="rounded-xl p-4 bg-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#96bf48]/20 flex items-center justify-center">
                  <Package className="w-4 h-4 text-[#96bf48]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Connect Shopify</p>
                  <p className="text-xs text-muted-foreground">Import products directly from your store</p>
                </div>
              </div>
              <input value={shopDomain} onChange={e => setShopDomain(e.target.value)}
                placeholder="your-store.myshopify.com" style={{ fontSize: 16 }}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              <input value={accessToken} onChange={e => setAccessToken(e.target.value)}
                placeholder="Access token" type="password" style={{ fontSize: 16 }}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              <Button onClick={connectShopify} disabled={!shopDomain || !accessToken || shopifyConnecting} className="w-full">
                {shopifyConnecting ? "Connecting…" : "Connect Store"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#96bf48]/20 flex items-center justify-center">
                    <Package className="w-3 h-3 text-[#96bf48]" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{(shopifyStore as any).shop_name || "Connected"}</span>
                </div>
                <Button size="sm" variant="outline" onClick={loadShopifyProducts} disabled={shopifyLoading} className="h-7 text-xs">
                  {shopifyLoading ? "Loading…" : "Refresh"}
                </Button>
              </div>
              {shopifyProducts.length > 0 && (
                <>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {shopifyProducts.map((p: any) => (
                      <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                        <input type="checkbox"
                          checked={selectedShopifyItems.has(`${p.id}:${p.variants?.[0]?.id || ""}`)}
                          onChange={() => {
                            const key = `${p.id}:${p.variants?.[0]?.id || ""}`;
                            setSelectedShopifyItems(prev => {
                              const n = new Set(prev);
                              n.has(key) ? n.delete(key) : n.add(key);
                              return n;
                            });
                          }}
                          className="rounded border-border" />
                        {p.image && <img src={p.image} alt={p.title} loading="lazy" className="w-10 h-10 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground">${p.variants?.[0]?.price || "0"}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedShopifyItems.size > 0 && (
                    <Button onClick={importSelected} className="w-full">
                      Import {selectedShopifyItems.size} Product{selectedShopifyItems.size > 1 ? "s" : ""}
                    </Button>
                  )}
                </>
              )}
              {shopifyProducts.length === 0 && !shopifyLoading && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Click "Refresh" to load your Shopify products
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── FLASH SALE TAB ── */}
      {tab === "flash" && (
        <div className="space-y-3">
          <div className="rounded-xl p-4 bg-card border border-border space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-semibold text-foreground">Flash Sale</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Drop the price on a live product for a limited time. Creates urgency and drives instant buys.
            </p>

            {/* Product selector */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Product</label>
              <select value={flashProductId} onChange={e => setFlashProductId(e.target.value)}
                style={{ fontSize: 16 }}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                <option value="">Select a product…</option>
                {products.filter((p: any) => !p.is_sold_out).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title} — ${p.type === "auction" ? `Auction $${p.starting_bid}` : `$${p.price}`}</option>
                ))}
              </select>
            </div>

            {/* Discount */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Discount</label>
              <div className="flex flex-wrap gap-1.5">
                {FLASH_DISCOUNTS.map(d => (
                  <button key={d} onClick={() => setFlashDiscount(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      flashDiscount === d ? "bg-amber-500 text-white border-amber-500" : "bg-secondary/50 text-muted-foreground border-border"
                    }`}>{d}%</button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Duration</label>
              <div className="flex flex-wrap gap-1.5">
                {FLASH_DURATIONS.map(d => (
                  <button key={d} onClick={() => setFlashDuration(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      flashDuration === d ? "bg-amber-500 text-white border-amber-500" : "bg-secondary/50 text-muted-foreground border-border"
                    }`}>{d < 60 ? `${d}s` : `${d / 60}m`}</button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {flashProductId && (() => {
              const p = products.find((x: any) => x.id === flashProductId);
              if (!p) return null;
              const salePrice = Math.round(p.price * (1 - flashDiscount / 100) * 100) / 100;
              return (
                <div className="rounded-lg p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                  <p className="text-xs font-semibold text-foreground">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm line-through text-muted-foreground">${p.price}</span>
                    <span className="text-lg font-black text-amber-400">${salePrice}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                      {flashDiscount}% OFF
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Sale lasts {flashDuration < 60 ? `${flashDuration} seconds` : `${flashDuration / 60} minute${flashDuration > 60 ? "s" : ""}`}
                  </p>
                </div>
              );
            })()}

            <Button onClick={() => { if (flashProductId) startFlashSale(flashProductId, flashDiscount, flashDuration); }}
              disabled={!flashProductId}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
              ⚡ Start Flash Sale
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
