import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, Star } from "lucide-react";

interface BizLinksData {
  id: string;
  business_name: string;
  tagline: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  phone: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  links: Array<{ label: string; url: string }> | null;
  status: string;
}

/**
 * Standalone mobile-first links page for a business tenant.
 * Route: /:username/links (registered before the /:username catch-all).
 */
export default function BusinessLinksPage() {
  const { username = "" } = useParams();
  const [biz, setBiz] = useState<BizLinksData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, account_type, business_status")
        .eq("username", username)
        .maybeSingle();
      if (!p || (p as any).account_type !== "business") {
        setLoading(false);
        return;
      }
      const { data: d } = await (supabase as any)
        .from("business_details")
        .select("id, business_name, tagline, logo_url, hero_image_url, phone, google_rating, google_reviews_count, links")
        .eq("profile_id", p.id)
        .maybeSingle();
      if (d) {
        setBiz({ ...(d as any), status: (p as any).business_status });
      }
      setLoading(false);
    })();
  }, [username]);

  useEffect(() => {
    if (!biz || biz.status !== "live") return;
    (supabase as any)
      .from("business_page_events")
      .insert({ business_id: biz.id, event_type: "view", metadata: { source: "links_page" } });
  }, [biz]);

  useEffect(() => {
    if (biz?.status === "live") return;
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex";
    document.head.appendChild(tag);
    return () => { document.head.removeChild(tag); };
  }, [biz?.status]);

  const logTap = async (label: string) => {
    if (!biz || biz.status !== "live") return;
    await (supabase as any)
      .from("business_page_events")
      .insert({ business_id: biz.id, event_type: "link_tap", metadata: { label } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Not found</h1>
          <p className="text-muted-foreground mt-2">No business links page at /{username}.</p>
        </div>
      </div>
    );
  }

  const links = biz.links ?? [];

  const isLive = biz.status === "live";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isLive && (
        <div className="w-full bg-[#6B5BFF]/10 border-b border-[#6B5BFF]/30 px-4 py-2 text-center text-sm">
          <span className="text-foreground/80">
            Preview —{" "}
            <Link to={`/claim/${username}`} className="text-[#6B5BFF] font-semibold underline">
              claim this page
            </Link>
            <span className="mx-2 text-muted-foreground">·</span>
            <a href="mailto:remove@uply.tv?subject=Takedown%20request" className="text-muted-foreground hover:text-foreground underline">
              Not your business?
            </a>
          </span>
        </div>
      )}
      <div className="max-w-md mx-auto px-5 pt-10 pb-16 flex flex-col items-center text-center">
        {biz.logo_url ? (
          <img src={biz.logo_url} alt={biz.business_name} className="w-24 h-24 rounded-full object-cover border-2 border-[#6B5BFF]/40" />
        ) : biz.hero_image_url ? (
          <img src={biz.hero_image_url} alt={biz.business_name} className="w-24 h-24 rounded-full object-cover border-2 border-[#6B5BFF]/40" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6B5BFF]/30 to-[#B025FF]/30 grid place-items-center text-3xl font-black">
            {biz.business_name.slice(0, 1)}
          </div>
        )}
        <h1 className="mt-4 text-2xl font-extrabold">{biz.business_name}</h1>
        {biz.tagline && <p className="mt-1 text-sm text-muted-foreground">{biz.tagline}</p>}
        {biz.google_rating != null && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 border border-border text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{biz.google_rating.toFixed(1)}</span>
            {biz.google_reviews_count != null && (
              <span className="text-muted-foreground">({biz.google_reviews_count})</span>
            )}
          </div>
        )}

        <div className="mt-8 w-full space-y-3">
          {biz.phone && (
            <a
              href={`tel:${biz.phone}`}
              onClick={() => logTap("__call__")}
              className="flex items-center justify-center gap-2 w-full rounded-xl px-5 py-4 bg-[#6B5BFF] hover:bg-[#5A4BEF] text-white font-semibold min-h-[52px]"
            >
              <Phone className="w-4 h-4" /> Call {biz.phone}
            </a>
          )}
          {links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => logTap(l.label)}
              className="block w-full text-center rounded-xl px-5 py-4 bg-white/[0.05] border border-border hover:border-[#6B5BFF]/60 hover:bg-white/[0.08] transition-colors font-semibold min-h-[52px]"
            >
              {l.label}
            </a>
          ))}
          {links.length === 0 && !biz.phone && (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          )}
        </div>

        <Link to={`/${username}`} className="mt-8 text-sm text-[#6B5BFF] hover:underline">
          Visit full page →
        </Link>
        <a href="https://uply.tv" className="mt-6 text-xs text-muted-foreground hover:text-foreground">
          Powered by UPLY
        </a>
      </div>
    </div>
  );
}
