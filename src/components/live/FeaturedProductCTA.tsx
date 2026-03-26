import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Check, Loader2, LogIn, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
}

interface Props {
  product: Product;
  streamId: string;
  creatorId: string;
  isCreatorView?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  community: "Community",
  course: "Course",
  classroom: "Classroom",
  pdf: "PDF",
  download: "Download",
  coaching: "Coaching",
};

function getTypeLabel(type: string) {
  return TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function getTypeEmoji(type: string) {
  const map: Record<string, string> = {
    course: "📚", community: "🤝", coaching: "🎯", classroom: "🎓", pdf: "📄", download: "📦",
  };
  return map[type] || "📦";
}

export default function FeaturedProductCTA({ product, streamId, creatorId, isCreatorView }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrollCount, setEnrollCount] = useState(0);

  const isFree = product.price === 0;

  // Check enrollment
  useEffect(() => {
    if (!user) { setEnrolled(false); return; }
    supabase
      .from("product_purchases")
      .select("id")
      .eq("product_id", product.id)
      .eq("buyer_id", user.id)
      .limit(1)
      .then(({ data }) => setEnrolled((data?.length || 0) > 0));
  }, [user, product.id]);

  // Realtime enrollment count for creator view
  useEffect(() => {
    if (!isCreatorView) return;
    const channel = supabase
      .channel(`enrollments-${streamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "product_purchases",
      }, (payload: any) => {
        if (payload.new?.metadata?.stream_id === streamId || payload.new?.stream_id === streamId) {
          setEnrollCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isCreatorView, streamId]);

  const handleCTAClick = () => {
    if (!user) {
      setModalOpen(true);
      return;
    }
    if (enrolled) {
      navigate(`/community/${creatorId}`, { state: { tab: product.type === "course" ? "classroom" : "community" } });
      return;
    }
    setModalOpen(true);
  };

  const handleFreeJoin = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("product_purchases").insert({
        product_id: product.id,
        buyer_id: user.id,
        creator_id: creatorId,
        amount: 0,
        status: "completed",
      });
      setEnrolled(true);
      toast.success(`You're in! Access ${product.name} now`);
      setModalOpen(false);
    } catch {
      toast.error("Something went wrong — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handlePaidPurchase = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-product-checkout", {
        body: {
          product_id: product.id,
          buyer_id: user.id,
          creator_id: creatorId,
          purchase_type: "course",
          success_url: `${window.location.origin}/stream/${streamId}?enrolled=true&product_id=${product.id}`,
          cancel_url: window.location.href,
          metadata: {
            buyer_id: user.id,
            creator_id: creatorId,
            product_id: product.id,
            stream_id: streamId,
            source: "live_stream",
            purchase_type: "course",
          },
        },
      });
      if (error) throw error;
      if (data?.url) {
        sessionStorage.setItem("uply_pending_purchase", JSON.stringify({
          product_id: product.id,
          return_path: window.location.pathname,
        }));
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error(e.message || "Payment couldn't start — please try again");
    } finally {
      setLoading(false);
    }
  };

  // Creator preview
  if (isCreatorView) {
    return (
      <div className="glass-card p-3 opacity-70">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Featured — Preview</span>
        </div>
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 text-lg">
              {getTypeEmoji(product.type)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
            <p className="text-[10px] text-muted-foreground">{getTypeLabel(product.type)} · {isFree ? "Free" : `$${product.price}`}</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold">
            Preview
          </div>
        </div>
        {enrollCount > 0 && (
          <motion.p
            key={enrollCount}
            initial={{ scale: 1.2, color: "#00FF85" }}
            animate={{ scale: 1, color: "rgba(255,255,255,0.5)" }}
            className="text-[10px] mt-2 text-center font-semibold"
          >
            🎉 {enrollCount} joined during this stream
          </motion.p>
        )}
      </div>
    );
  }

  // Viewer sticky card
  const ctaLabel = enrolled
    ? "Access Now →"
    : isFree
    ? "Join Free"
    : `Get Access · $${product.price}`;

  return (
    <>
      {/* Sticky card */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 z-30 safe-area-bottom"
      >
        <div
          className="mx-2 mb-2 rounded-2xl border overflow-hidden"
          style={{ backgroundColor: "rgba(13,13,13,0.95)", borderColor: "#1E1E1E", backdropFilter: "blur(16px)" }}
        >
          <div className="p-3 flex items-center gap-3">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(0,255,133,0.15), rgba(0,255,133,0.05))" }}>
                {getTypeEmoji(product.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#00FF85" }}>
                  {getTypeLabel(product.type)}
                </span>
              </div>
              <p className="text-sm font-bold text-white truncate">{product.name}</p>
              <p className="text-xs text-white/40">{isFree ? "Free" : `$${product.price}`}</p>
            </div>
            <button
              onClick={handleCTAClick}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all"
              style={
                enrolled
                  ? { backgroundColor: "rgba(0,255,133,0.1)", color: "#00FF85", border: "1px solid rgba(0,255,133,0.3)" }
                  : { backgroundColor: "#00FF85", color: "#0A0A0A" }
              }
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : enrolled ? (
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Access</span>
              ) : ctaLabel}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={() => !loading && setModalOpen(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
              style={{ backgroundColor: "#111111" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#00FF85" }}>
                  {getTypeLabel(product.type)}
                </span>
                <button onClick={() => !loading && setModalOpen(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thumbnail */}
              {product.image_url ? (
                <img src={product.image_url} alt="" className="w-full aspect-video object-cover rounded-lg mx-4 mb-3" style={{ width: "calc(100% - 32px)" }} />
              ) : (
                <div className="mx-4 mb-3 aspect-video rounded-lg flex items-center justify-center text-4xl"
                  style={{ background: "linear-gradient(135deg, rgba(0,255,133,0.1), rgba(0,255,133,0.02))" }}>
                  {getTypeEmoji(product.type)}
                </div>
              )}

              {/* Info */}
              <div className="px-4 pb-4">
                <h3 className="text-lg font-bold text-white mb-1">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-white/50 mb-4 line-clamp-2">{product.description}</p>
                )}

                {!user ? (
                  <>
                    <p className="text-sm text-white/60 text-center mb-3">Sign in to continue</p>
                    <button
                      onClick={() => { setModalOpen(false); navigate("/auth"); }}
                      className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}
                    >
                      <LogIn className="w-4 h-4" /> Sign In
                    </button>
                  </>
                ) : isFree ? (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-3xl font-extrabold text-white">Free</p>
                      <p className="text-xs text-white/40 mt-1">Instant access · No payment required</p>
                    </div>
                    <button
                      onClick={handleFreeJoin}
                      disabled={loading}
                      className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Instant Access"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-3xl font-extrabold text-white">${product.price}</p>
                      <p className="text-xs text-white/40 mt-1">One-time payment · Lifetime access</p>
                    </div>
                    <button
                      onClick={handlePaidPurchase}
                      disabled={loading}
                      className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Buy Now · $${product.price}`}
                    </button>
                    <p className="text-[10px] text-white/30 text-center mt-2">🔒 Secure payment powered by Stripe</p>
                  </>
                )}
              </div>

              {/* Success state */}
              {enrolled && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 pb-6 text-center"
                >
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "rgba(0,255,133,0.1)" }}>
                    <Check className="w-6 h-6" style={{ color: "#00FF85" }} />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">You're in!</p>
                  <p className="text-xs text-white/50 mb-3">Access {product.name} now</p>
                  <button
                    onClick={() => navigate(`/community/${creatorId}`, { state: { tab: product.type === "course" ? "classroom" : "community" } })}
                    className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto"
                    style={{ backgroundColor: "rgba(0,255,133,0.1)", color: "#00FF85" }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open {getTypeLabel(product.type)}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}