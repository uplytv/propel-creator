import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

interface Props {
  eventId: string;
  onClose: () => void;
}

const CATEGORIES = ["ticket", "ride", "gear", "merch", "other"];

export default function MarketplaceComposer({ eventId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>("ticket");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!content.trim()) throw new Error("Add a description");
      const { error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        event_id: eventId,
        content: content.trim(),
        post_type: "marketplace",
        marketplace_category: category,
        price: price ? parseFloat(price) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-marketplace", eventId] });
      toast.success("Listing posted");
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to post"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-4 max-h-[85vh] overflow-y-auto"
        style={{ border: "1px solid hsl(var(--border))" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">Post a Listing</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: category === c ? "#3D7CFF" : "hsl(var(--muted))",
                    color: category === c ? "#0A0A0A" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="2 GA tickets, face value, meeting at venue…"
              className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm bg-muted text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80 min-h-[88px] resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Price (optional)</label>
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$"
              className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm bg-muted text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80"
            />
          </div>

          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !content.trim()}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
          >
            {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}
