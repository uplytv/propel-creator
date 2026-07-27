import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Star, Sparkles } from "lucide-react";
import { getProfileHandleCandidates } from "@/lib/profileSlug";

interface BusinessInfo {
  id: string;
  username: string;
  business_name: string;
  tagline: string | null;
  category: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  business_status: string;
}

const BUSINESS_PRICE = 97;
const SETUP_FEE = 500;

// Persists the claimant's name+phone across the auth+Stripe round trip so the
// success handler can build the claim_request without a second form.
const intentKey = (username: string) => `uply_claim_intent_${username.toLowerCase()}`;

const included = [
  "Your page at uply.tv/yourname",
  "Links page (replaces Linktree)",
  "Blog that ranks on Google",
  "Lead capture with instant email alerts",
  "Call & visit analytics",
  "Weekly performance report",
];

export default function ClaimBusinessPage() {
  const { username = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [biz, setBiz] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingClaim, setExistingClaim] = useState<{ id: string; status: string } | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);

  const isCheckoutReturn = params.get("checkout") === "success";

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      const meta = (sess.session?.user?.user_metadata ?? {}) as { full_name?: string; phone?: string };
      setUserId(uid);
      if (sess.session?.user?.email) setEmail(sess.session.user.email);
      if (meta.full_name && !name) setName(meta.full_name);
      if (meta.phone && !phone) setPhone(meta.phone);

      const candidates = getProfileHandleCandidates(username);
      const rpcResults = await Promise.all(
        candidates.map((candidate) =>
          supabase.rpc("get_public_profile_by_username", { _username: candidate }).maybeSingle(),
        ),
      );
      const p = rpcResults.find((r: any) => r?.data)?.data as
        | { id: string; user_id: string; username: string; account_type: string | null; business_status: string | null }
        | undefined;

      if (!p || p.account_type !== "business") {
        setLoading(false);
        return;
      }

      const { data: d } = await supabase
        .from("business_details" as never)
        .select("business_name, tagline, category, hero_image_url, logo_url, google_rating, google_reviews_count")
        .eq("profile_id", p.id)
        .maybeSingle();
      setBiz({
        id: p.id,
        username: p.username,
        business_status: p.business_status ?? "draft",
        business_name: (d as any)?.business_name ?? p.username,
        tagline: (d as any)?.tagline ?? null,
        category: (d as any)?.category ?? null,
        hero_image_url: (d as any)?.hero_image_url ?? null,
        logo_url: (d as any)?.logo_url ?? null,
        google_rating: (d as any)?.google_rating ?? null,
        google_reviews_count: (d as any)?.google_reviews_count ?? null,
      });

      // Restore stashed intent (from pre-auth handoff)
      try {
        const raw = localStorage.getItem(intentKey(username));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.name && !name) setName(parsed.name);
          if (parsed.phone && !phone) setPhone(parsed.phone);
        }
      } catch { /* ignore */ }

      if (uid) {
        const { data: existing } = await supabase
          .from("claim_requests")
          .select("id, status")
          .eq("business_id", p.id)
          .eq("requester_user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1);
        if (existing && existing.length) setExistingClaim(existing[0] as any);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Post-checkout: auto-create the claim_request if not yet recorded.
  useEffect(() => {
    if (!isCheckoutReturn || !userId || !biz) return;
    if (existingClaim) {
      setJustClaimed(true);
      return;
    }
    (async () => {
      let intent: { name?: string; phone?: string } = {};
      try {
        const raw = localStorage.getItem(intentKey(username));
        if (raw) intent = JSON.parse(raw);
      } catch { /* ignore */ }
      const { data, error } = await supabase
        .from("claim_requests")
        .insert({
          business_id: biz.id,
          requester_user_id: userId,
          requester_name: intent.name || name || email.split("@")[0] || "Owner",
          requester_email: email,
          requester_phone: intent.phone || phone || null,
        })
        .select("id, status")
        .single();
      if (!error && data) {
        setExistingClaim(data as any);
        setJustClaimed(true);
        try { localStorage.removeItem(intentKey(username)); } catch { /* ignore */ }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckoutReturn, userId, biz?.id]);

  const startClaim = async () => {
    if (!biz) return;
    if (!name.trim()) {
      toast({ title: "Add your name", description: "So we know who to verify", variant: "destructive" });
      return;
    }
    // Stash intent for the round-trip through auth/Stripe.
    try {
      localStorage.setItem(intentKey(username), JSON.stringify({ name: name.trim(), phone: phone.trim() }));
    } catch { /* ignore */ }

    if (!userId) {
      // Uninterrupted: send to auth with return path, skip creator onboarding.
      navigate(
        `/auth?mode=signup&as=member&redirect=${encodeURIComponent(`/claim/${username}`)}`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-business-claim-checkout", {
        body: { business_id: biz.id },
      });
      if (error) throw error;
      if ((data as any)?.url) {
        window.location.href = (data as any).url;
      } else {
        throw new Error("Checkout URL missing");
      }
    } catch (e: any) {
      toast({ title: "Could not start checkout", description: e.message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Business not found</h1>
          <p className="text-muted-foreground">We couldn't find a business page at /{username}.</p>
        </div>
      </div>
    );
  }

  // Success state (post-checkout + claim recorded)
  if (justClaimed || (isCheckoutReturn && existingClaim)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-5 py-14 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#6B5BFF]/15 grid place-items-center">
            <CheckCircle2 className="w-9 h-9 text-[#6B5BFF]" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight">
            You claimed {biz.business_name} 🎉
          </h1>
          <p className="mt-3 text-muted-foreground">
            We verify ownership within 24 hours, then your page goes live and leads start coming to you.
          </p>

          <Card className="mt-8 p-5 text-left">
            <p className="text-xs uppercase tracking-widest text-[#6B5BFF] font-bold mb-3">What happens next</p>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3"><span className="font-bold text-[#6B5BFF]">1.</span> We verify you actually run this business (usually &lt; 24h).</li>
              <li className="flex gap-3"><span className="font-bold text-[#6B5BFF]">2.</span> Your page flips to <b>live</b> — Google can index it and leads open up.</li>
              <li className="flex gap-3"><span className="font-bold text-[#6B5BFF]">3.</span> You get an email with your dashboard login to edit anything.</li>
            </ol>
          </Card>

          <div className="mt-8 flex flex-col gap-3">
            <Link to={`/${biz.username}`}>
              <Button className="w-full h-12 bg-[#6B5BFF] hover:bg-[#5b4bf0]">Preview my page</Button>
            </Link>
            <a href="mailto:hello@uply.tv?subject=Claim%20support" className="text-sm text-muted-foreground hover:text-foreground">
              Questions? hello@uply.tv
            </a>
          </div>
        </div>
      </div>
    );
  }

  const alreadyPending = existingClaim && existingClaim.status !== "rejected";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 pt-8 pb-24">
        {/* Header block — social proof up top */}
        <div className="text-center">
          {biz.logo_url ? (
            <img src={biz.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-br from-[#6B5BFF]/30 to-[#B025FF]/30 grid place-items-center text-2xl font-black">
              {biz.business_name.slice(0, 1)}
            </div>
          )}
          <p className="mt-4 text-xs uppercase tracking-widest text-[#6B5BFF] font-bold">Built for you</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {biz.business_name}
          </h1>
          {biz.google_rating != null && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{biz.google_rating.toFixed(1)}★</span>
              {biz.google_reviews_count != null && (
                <span className="text-muted-foreground">· {biz.google_reviews_count.toLocaleString()} reviews</span>
              )}
            </div>
          )}
        </div>

        {/* Primary CTA (top) */}
        {!alreadyPending && (
          <Button
            onClick={startClaim}
            disabled={submitting}
            className="mt-6 w-full h-14 text-base font-bold bg-[#6B5BFF] hover:bg-[#5b4bf0]"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Claim my page — 2 minutes"}
          </Button>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Cancel anytime · No contract ·{" "}
          <a href="mailto:remove@uply.tv?subject=Takedown" className="underline hover:text-foreground">
            Not your business?
          </a>
        </p>

        {/* Live preview */}
        <Card className="mt-8 overflow-hidden">
          <div className="relative h-40 bg-gradient-to-br from-[#6B5BFF]/20 to-transparent">
            {biz.hero_image_url && (
              <img src={biz.hero_image_url} alt="" className="w-full h-full object-cover opacity-80" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-[10px] uppercase tracking-widest text-[#6B5BFF] font-bold">
                {biz.category ?? "Live preview"}
              </p>
              <p className="text-sm font-bold">uply.tv/{biz.username}</p>
            </div>
          </div>
          <div className="p-3">
            <Link to={`/${biz.username}`} target="_blank" className="text-xs text-[#6B5BFF] hover:underline">
              Open live preview in a new tab →
            </Link>
          </div>
        </Card>

        {/* Pricing block */}
        <Card className="mt-6 p-5">
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-extrabold">${BUSINESS_PRICE}</p>
            <p className="text-muted-foreground">/month</p>
          </div>
          <p className="mt-1 text-sm">
            <span className="line-through text-muted-foreground">${SETUP_FEE} setup fee</span>{" "}
            <span className="font-bold text-[#6B5BFF]">WAIVED — limited time</span>
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {included.map((line) => (
              <li key={line} className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6B5BFF] shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Inline 2-field details (only when signed in so it's not a wall) */}
        {userId && !alreadyPending && (
          <Card className="mt-6 p-5 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Two quick fields before checkout
            </p>
            <Input
              placeholder="Full name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[48px] text-base"
              autoComplete="name"
            />
            <Input
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-[48px] text-base"
              autoComplete="tel"
              inputMode="tel"
            />
          </Card>
        )}

        {/* Already-pending state */}
        {alreadyPending && (
          <Card className="mt-6 p-5">
            <p className="font-semibold">
              Claim status: <span className="capitalize text-[#6B5BFF]">{existingClaim!.status}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {existingClaim!.status === "pending"
                ? "We're verifying ownership — usually within 24 hours."
                : "Approved — your page is live under your account."}
            </p>
          </Card>
        )}

        {/* Primary CTA (bottom, mirrored) */}
        {!alreadyPending && (
          <>
            <Button
              onClick={startClaim}
              disabled={submitting}
              className="mt-6 w-full h-14 text-base font-bold bg-[#6B5BFF] hover:bg-[#5b4bf0]"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Claim my page — 2 minutes
                </span>
              )}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Cancel anytime · No contract ·{" "}
              <a href="mailto:remove@uply.tv?subject=Takedown" className="underline hover:text-foreground">
                Not your business?
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
