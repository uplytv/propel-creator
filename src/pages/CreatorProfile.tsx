import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["creator-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("display_name", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

  const { data: products } = useQuery({
    queryKey: ["creator-products", profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", profile!.user_id)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-8 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-24 w-24 rounded-full mb-4" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Creator not found</h1>
          <p className="text-muted-foreground mb-6">This creator profile doesn't exist.</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="container flex items-center gap-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{profile.display_name || "Creator"}</h1>
        </div>
      </header>

      <div className="container py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center mb-10">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name || ""} className="w-24 h-24 rounded-full object-cover mb-4" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary mb-4">
              {(profile.display_name || "C").charAt(0)}
            </div>
          )}
          <h2 className="text-2xl font-bold">{profile.display_name}</h2>
          {profile.creator_type && (
            <span className="mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">{profile.creator_type}</span>
          )}
          {profile.bio && <p className="text-muted-foreground mt-3 max-w-md">{profile.bio}</p>}
        </motion.div>

        {/* Products */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Products
          </h3>
          {products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((p: any) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card/40 p-5">
                  <h4 className="font-semibold">{p.name}</h4>
                  {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{p.type}</span>
                    <span className="font-bold text-primary">${Number(p.price).toFixed(2)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl border border-border bg-card/40">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No products published yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
