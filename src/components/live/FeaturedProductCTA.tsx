import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Check, Loader2, LogIn, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PurchaseOverlay } from "@/components/payments/PurchaseOverlay";

interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  source?: "digital" | "live_shop";
  live_product_data?: any;
}

interface Props {
  product: Product;
  streamId: string;
  creatorId: string;
  isCreatorView?: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  course: "📚", community: "🤝", coaching: "🎯", classroom: "🎓",
  pdf: "📄", download: "📦", product: "🛍️", auction: "🔨"
};
const TYPE_LABEL: Record<string, string> = {
  course: "Course", community: "Community", coaching: "Coaching", classroom: "Classroom",
  pdf: "PDF", download: "Download", product: "Product", auction: "Auction"
};
const getEmoji = (t: string) => TYPE_EMOJI[t] || "📦";
const getLabel = (t: string) => TYPE_LABEL[t] || t.charAt(0).toUpperCase() + t.slice(1);

export default function FeaturedProductCTA({ product, streamId, creatorId, isCreatorView }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrollCount, setEnrollCount] = useState(0);
  const isLiveShop = product.source === "live_shop";
  const isFree = !isLiveShop && product.price === 0;

  useEffect(() => {
    if (isLiveShop || !user) { setEnrolled(false); return; }
    supabase.from("product_purchases").select("id").eq("product_id", product.id).eq("buyer_id", user.id).limit(1)
      .then(({ data }) => setEnrolled((data?.length || 0) > 0));
  }, [user, product.id, isLiveShop]);

  useEffect(() => {
    if (!isCreatorView) return;
    const channel = supabase.channel(`enrollments-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "product_purchases" },
        (payload: any) => { if (payload.new?.stream_id === streamId) setEnrollCount(p => p + 1); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isCreatorView, streamId]);

  const handleLiveShopPurchase = async () => {
    if (!user) { setModalOpen(true); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-live-purchase", {
        body: { live_product_id: product.id, variant_selected: null, buyer_message: null },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) { toast.error(e.message || "Payment couldn't start"); }
    setLoading(false);
  };

  const handleFreeJoin = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("product_purchases").insert({ product_id: product.id, buyer_id: user.id, creator_id: creatorId, amount: 0, status: "completed" } as any);
      setEnrolled(true);
      toast.success(`You're in! Access ${product.name} now`);
      setModalOpen(false);
    } catch { toast.error("Something went wrong"); }
    setLoading(false);
  };

  const [showPurchaseOverlay, setShowPurchaseOverlay] = useState(false);

  const handlePaidPurchase = async () => {
    if (!user) return;
    // Open embedded overlay instead of navigating away
    setShowPurchaseOverlay(true);
  };

  const handleCTAClick = () => {
    if (!user) { setModalOpen(true); return; }
    if (isLiveShop) {
      if (product.type === "auction") { setModalOpen(true); return; }
      handleLiveShopPurchase();
      return;
    }
    if (enrolled) {
      navigate(`/community/${creatorId}`, { state: { tab: product.type === "course" ? "classroom" : "community" } });
      return;
    }
    setModalOpen(true);
  };

  if (isCreatorView) {
    return (
      <div className="mx-3 mb-3 rounded-xl p-3" style={{ backgroundColor: "rgba(10,10,10,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Featured — Preview</p>
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-xl">{getEmoji(product.type)}</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{product.name}</p>
            <p className="text-white/50 text-xs">{getLabel(product.type)} · {isFree ? "Free" : `$${product.price}`}</p>
          </div>
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white/50">Preview</span>
        </div>
        {enrollCount > 0 && (
          <p className="text-[11px] mt-2 font-medium" style={{ color: "#00FF85" }}>🎉 {enrollCount} joined during this stream</p>
        )}
      </div>
    );
  }

  const ctaLabel = isLiveShop
    ? (product.type === "auction" ? "Place Bid" : `Buy Now · $${product.price}`)
    : enrolled ? "Access Now →" : isFree ? "Join Free" : `Get Access · $${product.price}`;

  return (
    <>
      <div className="w-full">
        <div className="mx-3 mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(10,10,10,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={handleCTAClick} className="w-full p-3 flex items-center gap-3 text-left">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} loading="lazy" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-xl">{getEmoji(product.type)}</div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">{getLabel(product.type)}</span>
              <p className="text-white text-sm font-semibold truncate">{product.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "#00FF85" }}>{isFree ? "Free" : `$${product.price}`}</p>
            </div>
            <span className="px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : enrolled ? <>Access</> : ctaLabel}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={() => !loading && setModalOpen(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ backgroundColor: "hsl(var(--background))" }}>
              <div className="flex items-center justify-between p-4">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{getLabel(product.type)}</span>
                <button onClick={() => !loading && setModalOpen(false)} aria-label="Close" className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {product.image_url ? (
                <img src={product.image_url} alt={product.name} loading="lazy" className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-white/5 flex items-center justify-center text-5xl">{getEmoji(product.type)}</div>
              )}

              <div className="p-4 space-y-4">
                <h3 className="text-white text-lg font-bold">{product.name}</h3>
                {product.description && <p className="text-white/60 text-sm">{product.description}</p>}

                {!user ? (
                  <>
                    <p className="text-white/40 text-sm">Sign in to continue</p>
                    <button onClick={() => { setModalOpen(false); navigate("/auth"); }} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
                      <LogIn className="w-4 h-4" /> Sign In
                    </button>
                  </>
                ) : isLiveShop ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-white">{product.type === "auction" ? `Starting $${product.price}` : `$${product.price}`}</p>
                      <p className="text-white/40 text-xs">{product.type === "auction" ? "Live auction · Highest bid wins" : "Secure checkout · Ships to you"}</p>
                    </div>
                    {product.live_product_data?.free_shipping && <p className="text-xs" style={{ color: "#00FF85" }}>✓ Free Shipping</p>}
                    <button onClick={product.type === "auction" ? () => setModalOpen(false) : handleLiveShopPurchase} disabled={loading} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : product.type === "auction" ? "Bid in Live Stream" : `Buy Now · $${product.price}`}
                    </button>
                    <p className="text-white/30 text-[10px] text-center">🔒 Secure payment powered by Stripe</p>
                  </>
                ) : isFree ? (
                  <>
                    <p className="text-2xl font-bold text-white">Free</p>
                    <p className="text-white/40 text-xs">Instant access · No payment required</p>
                    <button onClick={handleFreeJoin} disabled={loading} className="w-full py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Instant Access"}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-white">${product.price}</p>
                    <p className="text-white/40 text-xs">One-time payment · Lifetime access</p>
                    <button onClick={handlePaidPurchase} disabled={loading} className="w-full py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Buy Now · $${product.price}`}
                    </button>
                    <p className="text-white/30 text-[10px] text-center">🔒 Secure payment powered by Stripe</p>
                  </>
                )}

                {enrolled && (
                  <div className="text-center space-y-2 pt-2">
                    <Check className="w-6 h-6 mx-auto" style={{ color: "#00FF85" }} />
                    <p className="text-white text-sm font-semibold">You're in!</p>
                    <button onClick={() => navigate(`/community/${creatorId}`, { state: { tab: product.type === "course" ? "classroom" : "community" } })} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto" style={{ backgroundColor: "rgba(0,255,133,0.1)", color: "#00FF85" }}>
                      <ExternalLink className="w-3 h-3" /> Open {getLabel(product.type)}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PurchaseOverlay
        isOpen={showPurchaseOverlay}
        onClose={() => setShowPurchaseOverlay(false)}
        onSuccess={() => {
          setEnrolled(true);
          setShowPurchaseOverlay(false);
          toast.success(`You're in! Access ${product.name} now`);
        }}
        purchaseType="product"
        purchaseParams={{
          product_id: product.id,
          buyer_id: user?.id,
          creator_id: creatorId,
          purchase_type: "course",
          metadata: { buyer_id: user?.id, creator_id: creatorId, product_id: product.id, stream_id: streamId, source: "live_stream", purchase_type: "course" },
        }}
        title={product.name}
        description={product.description || undefined}
        price={product.price}
      />
    </>
  );
}
