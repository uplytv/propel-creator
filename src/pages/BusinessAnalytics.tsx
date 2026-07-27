import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import PageHero from "@/components/layout/PageHero";
import { Eye, Phone, MapPin, FileText, MessageSquare, Loader2 } from "lucide-react";

interface Summary {
  business_id: string;
  views_7d: number;
  call_taps_7d: number;
  maps_taps_7d: number;
  blog_views_7d: number;
  leads_7d: number;
  top_blog_post_id: string | null;
}

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  handled: boolean;
  created_at: string;
}

/**
 * Business owner dashboard: 7-day analytics + recent leads.
 * Renders only when the signed-in user owns a business_details row.
 */
export default function BusinessAnalytics() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!prof?.id) return;
      const { data } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: { id: string; business_name: string } | null }>;
            };
          };
        };
      })
        .from("business_details")
        .select("id, business_name")
        .eq("profile_id", prof.id)
        .maybeSingle();
      if (data) {
        setBusinessId(data.id);
        setBusinessName(data.business_name);
      }
    })();
  }, [user]);

  const { data: summary } = useQuery({
    queryKey: ["biz-summary", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: Summary | null }>;
            };
          };
        };
      })
        .from("business_weekly_summary")
        .select("*")
        .eq("business_id", businessId!)
        .maybeSingle();
      return data ?? { business_id: businessId!, views_7d: 0, call_taps_7d: 0, maps_taps_7d: 0, blog_views_7d: 0, leads_7d: 0, top_blog_post_id: null };
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["biz-leads", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, val: string) => {
              order: (o: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: Lead[] | null }>;
              };
            };
          };
        };
      })
        .from("business_leads")
        .select("id, name, phone, email, message, handled, created_at")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false })
        .limit(25);
      return data ?? [];
    },
  });

  if (!user) return null;

  if (!businessId) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-8 text-center">
        <div>
          <h1 className="text-xl font-bold text-foreground">No business page yet</h1>
          <p className="text-muted-foreground mt-2">Ask an UPLY admin to set up your business profile.</p>
        </div>
      </div>
    );
  }

  const stats = summary ?? null;
  const cards = [
    { icon: Eye, label: "Page views", value: stats?.views_7d ?? "—" },
    { icon: Phone, label: "Call taps", value: stats?.call_taps_7d ?? "—" },
    { icon: MapPin, label: "Directions taps", value: stats?.maps_taps_7d ?? "—" },
    { icon: FileText, label: "Blog views", value: stats?.blog_views_7d ?? "—" },
    { icon: MessageSquare, label: "Leads", value: stats?.leads_7d ?? "—" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHero eyebrow="Business" title={businessName || "Your business"} subtitle="Last 7 days" />
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl p-4 bg-white/[0.03] border border-border">
              <c.icon className="w-4 h-4 mb-2 text-[#6B5BFF]" />
              <p className="text-2xl font-black text-foreground">{c.value}</p>
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4">
        <h2 className="text-xl font-bold mb-4">Recent leads</h2>
        {!leads ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : leads.length === 0 ? (
          <p className="text-muted-foreground text-sm">No leads yet.</p>
        ) : (
          <ul className="space-y-3">
            {leads.map((l) => (
              <li key={l.id} className="rounded-xl p-4 bg-white/[0.03] border border-border">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{l.name || "Anonymous"}</p>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {l.phone && <span>{l.phone}</span>}
                  {l.email && <span>{l.email}</span>}
                </div>
                {l.message && <p className="mt-2 text-foreground/90 whitespace-pre-wrap text-sm">{l.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
