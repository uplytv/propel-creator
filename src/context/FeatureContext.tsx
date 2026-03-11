import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface FeatureContextType {
  features: Record<string, boolean>;
  loading: boolean;
  isEnabled: (featureKey: string) => boolean;
  isCoreEnabled: (core: string) => boolean;
  userCategory: string | null;
}

const FeatureContext = createContext<FeatureContextType>({
  features: {},
  loading: true,
  isEnabled: () => true,
  isCoreEnabled: () => true,
  userCategory: null,
});

export function FeatureProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Get user's business category
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-category", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("business_category")
        .eq("user_id", user!.id)
        .single();
      return data as any;
    },
    enabled: !!user,
  });

  // Get category ID from slug
  const { data: category } = useQuery({
    queryKey: ["business-category", userProfile?.business_category],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_categories")
        .select("id, slug")
        .eq("slug", userProfile!.business_category)
        .single();
      return data;
    },
    enabled: !!userProfile?.business_category,
  });

  // Get all feature definitions
  const { data: allFeatures = [] } = useQuery({
    queryKey: ["feature-registry"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_registry")
        .select("key, core, tier, default_enabled")
        .order("position");
      return data || [];
    },
  });

  // Get category defaults
  const { data: categoryDefaults = [] } = useQuery({
    queryKey: ["category-defaults", category?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("category_feature_defaults")
        .select("feature_key, enabled")
        .eq("category_id", category!.id);
      return data || [];
    },
    enabled: !!category?.id,
  });

  // Get user overrides
  const { data: userOverrides = [] } = useQuery({
    queryKey: ["user-feature-overrides", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_feature_overrides")
        .select("feature_key, enabled")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Resolve: Feature default → Category default → User override
  const features: Record<string, boolean> = {};
  const categoryMap = Object.fromEntries(categoryDefaults.map((d: any) => [d.feature_key, d.enabled]));
  const overrideMap = Object.fromEntries(userOverrides.map((o: any) => [o.feature_key, o.enabled]));

  for (const f of allFeatures) {
    const feat = f as any;
    // Priority: user override > category default > global default
    if (overrideMap[feat.key] !== undefined) {
      features[feat.key] = overrideMap[feat.key];
    } else if (categoryMap[feat.key] !== undefined) {
      features[feat.key] = categoryMap[feat.key];
    } else {
      features[feat.key] = feat.default_enabled;
    }
  }

  const isEnabled = (key: string) => {
    // If no category set yet (new user), show everything
    if (!userProfile?.business_category) return true;
    return features[key] !== false;
  };

  const isCoreEnabled = (core: string) => {
    // A core is enabled if ANY feature in that core is enabled
    const coreFeatures = allFeatures.filter((f: any) => f.core === core);
    if (coreFeatures.length === 0) return true;
    return coreFeatures.some((f: any) => isEnabled(f.key));
  };

  const loading = !allFeatures.length;

  return (
    <FeatureContext.Provider value={{
      features,
      loading,
      isEnabled,
      isCoreEnabled,
      userCategory: userProfile?.business_category || null,
    }}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures() {
  return useContext(FeatureContext);
}
