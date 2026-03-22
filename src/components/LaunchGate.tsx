import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import WaitlistPage from "@/pages/WaitlistPage";

interface LaunchGateProps {
  children: React.ReactNode;
}

export default function LaunchGate({ children }: LaunchGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [isLaunched, setIsLaunched] = useState<boolean | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      // Fetch launch status
      const { data: config } = await supabase
        .from("launch_config")
        .select("is_launched")
        .limit(1)
        .single();

      setIsLaunched(config?.is_launched ?? false);

      if (user) {
        // Check admin role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin");

        if (roles && roles.length > 0) {
          setIsApproved(true);
          setChecking(false);
          return;
        }

        // Check if user's email has early_access on the waitlist
        if (user.email) {
          const { data: waitlistEntry } = await supabase
            .from("waitlist" as any)
            .select("early_access")
            .eq("email", user.email.toLowerCase())
            .maybeSingle() as any;

          if (waitlistEntry?.early_access) {
            setIsApproved(true);
          }
        }
      }

      setChecking(false);
    };

    if (!authLoading) {
      check();
    }
  }, [user, authLoading]);

  if (checking || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If launched or user is approved/admin, show the app
  if (isLaunched || isApproved) {
    return <>{children}</>;
  }

  // Otherwise show waitlist
  return <WaitlistPage />;
}
