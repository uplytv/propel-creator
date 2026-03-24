import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth();
  const [gateStatus, setGateStatus] = useState<"loading" | "approved" | "needs_onboarding" | "waitlist" | "unauthenticated">("loading");

  const check = useCallback(async () => {
    if (!user) return;

    // Check admin role first
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (roles && roles.length > 0) {
      setGateStatus("approved");
      return;
    }

    // Check launch config
    const { data: config } = await supabase
      .from("launch_config")
      .select("is_launched")
      .limit(1)
      .single();

    if (config?.is_launched) {
      setGateStatus("approved");
      return;
    }

    // Check profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, is_approved")
      .eq("user_id", user.id)
      .single();

    const p = profile as any;

    if (!p?.onboarding_complete) {
      setGateStatus("needs_onboarding");
      return;
    }

    if (p?.is_approved) {
      setGateStatus("approved");
      return;
    }

    setGateStatus("waitlist");
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!session || !user) {
      setGateStatus("unauthenticated");
      return;
    }

    check();

    // Listen for profile changes (e.g. admin approves the user)
    const channel = supabase
      .channel(`protected-route-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => check()
      )
      .subscribe();

    // Also re-check when window regains focus (covers tab switching)
    const handleFocus = () => check();
    window.addEventListener("focus", handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [session, user, loading, check]);

  if (loading || gateStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (gateStatus === "unauthenticated") {
    return <Navigate to="/auth" replace />;
  }

  if (gateStatus === "needs_onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (gateStatus === "waitlist") {
    return <Navigate to="/waitlist" replace />;
  }

  return <>{children}</>;
}
