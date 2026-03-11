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
  const [isAdmin, setIsAdmin] = useState(false);
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

      // Check admin role if user is logged in
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin");

        setIsAdmin((roles && roles.length > 0) ?? false);
      }

      setChecking(false);
    };

    if (!authLoading) {
      check();
    }
  }, [user, authLoading]);

  if (checking || authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00FF85] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If launched or user is admin, show the app
  if (isLaunched || isAdmin) {
    return <>{children}</>;
  }

  // Otherwise show waitlist
  return <WaitlistPage />;
}
