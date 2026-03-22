import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface LaunchGateProps {
  children: React.ReactNode;
}

export default function LaunchGate({ children }: LaunchGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "launched" | "approved" | "needs_onboarding" | "waitlist" | "unauthenticated">("loading");

  useEffect(() => {
    const check = async () => {
      // Check if platform is launched
      const { data: config } = await supabase
        .from("launch_config")
        .select("is_launched")
        .limit(1)
        .single();

      if (config?.is_launched) {
        setStatus("launched");
        return;
      }

      if (!user) {
        setStatus("unauthenticated");
        return;
      }

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (roles && roles.length > 0) {
        setStatus("approved");
        return;
      }

      // Check profile status
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, is_approved")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setStatus("needs_onboarding");
        return;
      }

      const p = profile as any;

      if (p.is_approved) {
        setStatus("approved");
        return;
      }

      if (!p.onboarding_complete) {
        setStatus("needs_onboarding");
        return;
      }

      setStatus("waitlist");
    };

    if (!authLoading) {
      check();
    }
  }, [user, authLoading]);

  if (status === "loading" || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Launched or approved: full access
  if (status === "launched" || status === "approved") {
    return <>{children}</>;
  }

  // Unauthenticated: show public app (landing, auth, etc.)
  if (status === "unauthenticated") {
    return <>{children}</>;
  }

  // The routing in App.tsx handles showing onboarding vs waitlist
  // We just need to pass through but restrict access
  return <>{children}</>;
}
