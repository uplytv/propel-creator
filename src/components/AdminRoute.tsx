import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role" as any, {
        _user_id: session!.user.id,
        _role: "admin",
      });
      return !!data;
    },
    enabled: !!session?.user?.id,
  });

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
