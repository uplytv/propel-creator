import { createContext, useContext, useEffect, type ReactNode, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Brand = {
  brandName: string | null;
  logoUrl: string | null;
  primaryHsl: string | null;
  accentHsl: string | null;
  supportEmail: string | null;
  enabled: boolean;
};

const DEFAULT_BRAND: Brand = {
  brandName: "UPLY",
  logoUrl: "/logo.png",
  primaryHsl: null,
  accentHsl: null,
  supportEmail: null,
  enabled: false,
};

const BrandContext = createContext<Brand>(DEFAULT_BRAND);

/** Read the active brand (the creator's white-label brand, or UPLY by default). */
export function useBrand(): Brand {
  return useContext(BrandContext);
}

/** Fetch an enabled white-label brand for a given creator. Returns null if none/disabled. */
export function useWhitelabelBrand(creatorId?: string | null) {
  return useQuery({
    queryKey: ["whitelabel-brand", creatorId],
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Brand | null> => {
      const { data, error } = await (supabase as any)
        .from("whitelabel_config")
        .select("brand_name, logo_url, primary_hsl, accent_hsl, support_email, enabled")
        .eq("creator_id", creatorId)
        .eq("enabled", true)
        .maybeSingle();
      if (error || !data) return null;
      return {
        brandName: data.brand_name ?? null,
        logoUrl: data.logo_url ?? null,
        primaryHsl: data.primary_hsl ?? null,
        accentHsl: data.accent_hsl ?? null,
        supportEmail: data.support_email ?? null,
        enabled: !!data.enabled,
      };
    },
  });
}

/**
 * Applies a creator's white-label theme to the document while mounted and
 * reverts on unmount. Use on full-screen member surfaces (their space/profile)
 * where wrapping the JSX isn't convenient. Returns the brand (UPLY by default)
 * so callers can swap logo/name too.
 */
export function useApplyBrandTheme(creatorId?: string | null): Brand {
  const { data: brand } = useWhitelabelBrand(creatorId);
  const primaryHsl = brand?.primaryHsl ?? null;
  const accentHsl = brand?.accentHsl ?? null;

  useEffect(() => {
    if (!primaryHsl) return;
    const root = document.documentElement;
    const vars = ["--primary", "--ring", "--accent", "--sidebar-primary"] as const;
    const prev = Object.fromEntries(vars.map((v) => [v, root.style.getPropertyValue(v)]));
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--ring", primaryHsl);
    root.style.setProperty("--accent", accentHsl ?? primaryHsl);
    root.style.setProperty("--sidebar-primary", primaryHsl);
    return () => {
      for (const v of vars) {
        if (prev[v]) root.style.setProperty(v, prev[v]);
        else root.style.removeProperty(v);
      }
    };
  }, [primaryHsl, accentHsl]);

  return brand ?? DEFAULT_BRAND;
}

/**
 * Wraps a creator's member-facing surface in their white-label brand:
 * overrides the --primary/--ring/--accent tokens (scoped to this subtree) and
 * provides brandName/logoUrl to descendants via useBrand(). Falls back to UPLY.
 */
export function BrandScope({
  creatorId,
  children,
  className,
}: {
  creatorId?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const { data: brand } = useWhitelabelBrand(creatorId);
  const active = brand ?? DEFAULT_BRAND;

  const style: CSSProperties = {};
  if (brand?.primaryHsl) {
    (style as any)["--primary"] = brand.primaryHsl;
    (style as any)["--ring"] = brand.primaryHsl;
    (style as any)["--sidebar-primary"] = brand.primaryHsl;
    (style as any)["--accent"] = brand.accentHsl ?? brand.primaryHsl;
  }

  return (
    <BrandContext.Provider value={active}>
      <div className={className} style={style}>
        {children}
      </div>
    </BrandContext.Provider>
  );
}
