import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface HeydarModalProps {
  count: number;
  onClose: () => void;
}

const tokenOptions = [
  { tokens: 1, price: "$7.99", priceNum: 799, savings: null },
  { tokens: 3, price: "$18.99", priceNum: 1899, savings: "Save 21%" },
  { tokens: 5, price: "$26.99", priceNum: 2699, savings: "Save 32%" },
];

export default function HeydarModal({ count, onClose }: HeydarModalProps) {
  const { user } = useAuth();
  const [selectedTokens, setSelectedTokens] = useState(1);
  const [activating, setActivating] = useState(false);

  // Fetch wallet balance
  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      return data as { balance: number } | null;
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  const tokenBalance = Math.floor((wallet?.balance || 0) / 799); // rough token estimate

  const handleActivate = async () => {
    if (!user) return;
    setActivating(true);
    try {
      // Update heydar_active_until on profiles
      const activeUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({ heydar_active_until: activeUntil })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Heydar activated for 7 days! ⚡");
      onClose();
    } catch {
      toast.error("Failed to activate Heydar");
    }
    setActivating(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[99]"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-[100] max-h-[90vh] overflow-y-auto"
        style={{
          background: "#141414",
          borderRadius: "20px 20px 0 0",
          padding: "16px 20px 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 20px" }} />

        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "rgba(255,255,255,0.5)" }}>
          <X className="w-5 h-5" />
        </button>

        {/* Count */}
        <div className="mb-4">
          <span style={{ fontSize: 32, fontWeight: 900, color: "#3D7CFF" }}>{count}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", marginLeft: 8 }}>
            People Heyed you locally
          </span>
        </div>

        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 20 }}>
          Activate Heydar to see who Heyed you at ALL local events
        </p>

        {/* Activate */}
        <button
          onClick={handleActivate}
          disabled={activating}
          className="w-full flex items-center justify-center gap-2 transition-transform active:scale-[0.97]"
          style={{
            height: 52,
            background: "#3D7CFF",
            borderRadius: 12,
            border: "none",
            fontSize: 15,
            fontWeight: 800,
            color: "#0A0A0A",
            opacity: activating ? 0.6 : 1,
            marginBottom: 4,
          }}
        >
          {activating && <Loader2 className="w-4 h-4 animate-spin" />}
          ACTIVATE LOCAL HEYDAR — 1 Token for 7 Days
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
          You have {tokenBalance} Token{tokenBalance !== 1 ? "s" : ""}
        </p>

        {/* Premium card */}
        <div
          className="transition-transform active:scale-[0.98] cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #00C9B1, #0066FF)",
            borderRadius: 14,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>UPLY Premium</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
            1 Token/month + unlimited Heys + priority discovery
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
            starts at $5.83/month
          </p>
        </div>

        {/* Token purchase options */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", marginBottom: 10 }}>Buy Tokens</p>
        <div className="flex gap-3">
          {tokenOptions.map((opt) => {
            const isSelected = selectedTokens === opt.tokens;
            return (
              <button
                key={opt.tokens}
                onClick={() => setSelectedTokens(opt.tokens)}
                className="flex-1 flex flex-col items-center gap-1 transition-transform active:scale-95"
                style={{
                  border: `1.5px solid ${isSelected ? "#3D7CFF" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 12,
                  padding: "16px 8px",
                  background: isSelected ? "rgba(61, 124, 255,0.06)" : "transparent",
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 800, color: "#FFFFFF" }}>
                  {opt.tokens} Token{opt.tokens > 1 ? "s" : ""}
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{opt.price}</span>
                {opt.savings && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3D7CFF" }}>{opt.savings}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
