import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function PendingApproval() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // Auto-check every 10s and on realtime update
  useEffect(() => {
    if (!user) return;

    const checkApproval = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", user.id)
        .single();
      if ((data as any)?.is_approved) {
        navigate("/dashboard", { replace: true });
      }
    };

    // Poll every 10s
    const interval = setInterval(checkApproval, 10000);

    // Listen for realtime updates
    const channel = supabase
      .channel(`pending-approval-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if ((payload.new as any)?.is_approved) {
            navigate("/dashboard", { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const manualCheck = async () => {
    setChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("is_approved")
      .eq("user_id", user!.id)
      .single();
    if ((data as any)?.is_approved) {
      navigate("/dashboard", { replace: true });
    }
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-heading font-bold">Your access is pending approval</h1>

        <p className="text-muted-foreground leading-relaxed">
          Thanks for joining UPLY. Our team will review and activate your account shortly.
          This page will automatically update once you're approved.
        </p>

        {/* Auto-refresh indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Checking for approval automatically...
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={manualCheck}
            disabled={checking}
            className="gap-2 mx-auto"
          >
            {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Check Now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => supabase.auth.signOut()}
            className="gap-2 mx-auto text-muted-foreground"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
