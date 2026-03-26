import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Copy, Check, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";

interface InviteCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_by_name?: string;
}

export default function InviteCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("invite_codes")
        .select("id, code, is_used, used_by")
        .eq("owner_id", user.id)
        .order("created_at") as any;

      if (data) {
        // Fetch names of users who used codes
        const enriched = await Promise.all(
          data.map(async (c: any) => {
            if (c.used_by) {
              const { data: prof } = await supabase
                .from("profiles")
                .select("first_name, display_name")
                .eq("user_id", c.used_by)
                .single();
              return { ...c, used_by_name: (prof as any)?.first_name || (prof as any)?.display_name || "Someone" };
            }
            return c;
          })
        );
        setCodes(enriched);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const remaining = codes.filter((c) => !c.is_used).length;

  const copyCode = async (code: string) => {
    const url = `https://uply.tv/invite/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Your Invite Codes</h1>
            <p className="text-sm text-muted-foreground">{remaining} of 5 remaining</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-card animate-pulse" />
            ))}
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">You don't have any invite codes yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Invite codes are granted when you're approved.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((code, i) => (
              <motion.div
                key={code.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-4 rounded-xl border ${
                  code.is_used ? "bg-card/50 border-border" : "bg-card border-primary/20"
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-mono font-semibold text-foreground">{code.code}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {code.is_used ? `Used by ${code.used_by_name}` : "Available"}
                  </p>
                </div>
                {code.is_used ? (
                  <Check className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => copyCode(code.code)} className="gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
