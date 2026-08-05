import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Star, Sparkles, Mail } from "lucide-react";
import { getProfileHandleCandidates } from "@/lib/profileSlug";

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c3 0 5.7 1.1 7.7 3l5.7-5.7C33.7 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.6 19 12.5 24 12.5c3 0 5.7 1.1 7.7 3l5.7-5.7C33.7 6.5 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 13-5l-6-5.1c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.1 16.1 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.4l6 5.1c-.4.4 6.5-4.7 6.5-14.5 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

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

interface AuthUserInfo {
  id: string;
  email: string;
  fullName: string;
}

const BUSINESS_PRICE = 97;
const SETUP_FEE = 500;

const claimIntentKey = (username: string) => `uply_claim_checkout_intent_${username.toLowerCase()}`;

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
  const [biz, setBiz] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUserInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsName, setDetailsName] = useState("");
  const [detailsPhone, setDetailsPhone] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [existingClaim, setExistingClaim] = useState<{ id: string; status: string; requester_phone?: string | null } | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);
  const [phoneText, setPhoneText] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);

  const isCheckoutReturn = params.get("checkout") === "success";
  const isCheckoutCancel = params.get("checkout") === "cancel";

  const getClaimReturnUrl = useCallback((targetUsername = username) => {
    const cleanUsername = targetUsername || username;
    return `${window.location.origin}/claim/${cleanUsername}?claim_auth=1`;
  }, [username]);

  const rememberCheckoutIntent = useCallback(() => {
    try {
      localStorage.setItem(
        claimIntentKey(username),
        JSON.stringify({ username, startedAt: Date.now() }),
      );
    } catch {
      // Best effort only; the URL return param also preserves the claim target.
    }
  }, [username]);

  const clearCheckoutIntent = useCallback(() => {
    try { localStorage.removeItem(claimIntentKey(username)); } catch { /* ignore */ }
  }, [username]);

  const hasCheckoutIntent = useCallback(() => {
    if (params.get("claim_auth") === "1") return true;
    try {
      const raw = localStorage.getItem(claimIntentKey(username));
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { startedAt?: number };
      return !parsed.startedAt || Date.now() - parsed.startedAt < 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }, [params, username]);

  const getAuthUserInfo = useCallback(async (): Promise<AuthUserInfo | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user?.id || !user.email) return null;
    const meta = (user.user_metadata ?? {}) as {
      full_name?: string;
      name?: string;
      display_name?: string;
    };
    const fullName =
      meta.full_name?.trim() ||
      meta.name?.trim() ||
      meta.display_name?.trim() ||
      user.email.split("@")[0] ||
      "Owner";
    return { id: user.id, email: user.email, fullName };
  }, []);

  const startCheckout = useCallback(async (businessId: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-business-claim-checkout", {
        body: { business_id: businessId },
      });
      if (error) throw error;
      if ((data as any)?.url) {
        window.location.href = (data as any).url;
        return;
      }
      throw new Error("Checkout URL missing");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Please try again.";
      toast({ title: "Could not start checkout", description: message, variant: "destructive" });
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const currentUser = await getAuthUserInfo();
      setAuthUser(currentUser);
      if (currentUser?.email) setAuthEmail(currentUser.email);

      const candidates = getProfileHandleCandidates(username);
      const rpcResults = await Promise.all(
        candidates.map((candidate) =>
          supabase.rpc("get_public_profile_by_username", { _username: candidate }).maybeSingle(),
        ),
      );
      const p = rpcResults.find((r: any) => r?.data)?.data as
        | { id: string; user_id: string; username: string; account_type: string | null; business_status: string | null }
        | undefined;

      // Claimable tenants: business pages, and creator pages seeded with the
      // same draft → preview → claim pattern (business_status set).
      const claimable =
        p?.account_type === "business" || (p?.account_type === "creator" && !!p?.business_status);
      if (!p || !claimable) {
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

      if (currentUser?.id) {
        const { data: existing } = await supabase
          .from("claim_requests")
          .select("id, status, requester_phone")
          .eq("business_id", p.id)
          .eq("requester_user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (existing && existing.length) {
          setExistingClaim(existing[0] as any);
          setPhoneText(((existing[0] as any).requester_phone as string | null) ?? "");
        }
      }
      setLoading(false);
    })();
  }, [getAuthUserInfo, username]);

  // Post-checkout: auto-create the claim_request if not yet recorded.
  useEffect(() => {
    if (!isCheckoutReturn || !authUser || !biz) return;
    if (existingClaim) {
      setJustClaimed(true);
      clearCheckoutIntent();
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("claim_requests")
        .insert({
          business_id: biz.id,
          requester_user_id: authUser.id,
          requester_name: authUser.fullName,
          requester_email: authUser.email,
          requester_phone: null,
        })
        .select("id, status, requester_phone")
        .single();
      if (!error && data) {
        setExistingClaim(data as any);
        setJustClaimed(true);
        clearCheckoutIntent();
      } else if (error) {
        toast({ title: "Claim recorded late", description: error.message, variant: "destructive" });
      }
    })();
  }, [authUser, biz, clearCheckoutIntent, existingClaim, isCheckoutReturn]);

  useEffect(() => {
    if (isCheckoutCancel) {
      clearCheckoutIntent();
      setSubmitting(false);
      toast({ title: "Checkout canceled", description: "Your page is still ready to claim when you are." });
      return;
    }
    if (loading || isCheckoutReturn || !biz || !authUser || existingClaim || submitting) return;
    if (!hasCheckoutIntent()) return;
    startCheckout(biz.id);
  }, [authUser, biz, clearCheckoutIntent, existingClaim, hasCheckoutIntent, isCheckoutCancel, isCheckoutReturn, loading, startCheckout, submitting]);

  const openDetailsWithPrefill = (user: AuthUserInfo) => {
    setDetailsName((current) => current || user.fullName);
    setDetailsOpen(true);
  };

  const startClaim = async () => {
    if (!biz) return;
    rememberCheckoutIntent();
    const currentUser = authUser ?? await getAuthUserInfo();
    if (!currentUser) {
      setAuthEmail((v) => v || "");
      setAuthOpen(true);
      return;
    }
    setAuthUser(currentUser);
    openDetailsWithPrefill(currentUser);
  };

  const continueWithGoogle = async () => {
    if (!biz) return;
    rememberCheckoutIntent();
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: getClaimReturnUrl(biz.username),
      extraParams: { prompt: "select_account" },
    });
    if (result.error) {
      setSubmitting(false);
      toast({ title: "Google sign in failed", description: result.error.message, variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    const currentUser = await getAuthUserInfo();
    setSubmitting(false);
    if (currentUser) {
      setAuthUser(currentUser);
      setAuthOpen(false);
      openDetailsWithPrefill(currentUser);
    }
  };

  const continueWithEmailPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!biz || !authEmail.trim() || !authPassword) return;
    rememberCheckoutIntent();
    setEmailSubmitting(true);
    const email = authEmail.trim();
    let error: { message: string } | null = null;
    if (emailMode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: authPassword,
        options: { emailRedirectTo: getClaimReturnUrl(biz.username) },
      });
      error = signUpError;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: authPassword });
      error = signInError;
    }
    setEmailSubmitting(false);
    if (error) {
      toast({ title: emailMode === "signup" ? "Sign up failed" : "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    const currentUser = await getAuthUserInfo();
    if (!currentUser) {
      toast({
        title: "Check your inbox",
        description: "Confirm your email to continue to checkout.",
      });
      return;
    }
    setAuthUser(currentUser);
    setAuthOpen(false);
    openDetailsWithPrefill(currentUser);
  };

  const confirmDetailsAndCheckout = async () => {
    if (!biz || !authUser) return;
    const name = detailsName.trim();
    if (!name) {
      toast({ title: "Add your name", description: "So we know who to verify.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    // Pre-create a pending claim_request with the collected name/phone so we
    // never lose the data across the Stripe redirect.
    const { data, error } = await supabase
      .from("claim_requests")
      .insert({
        business_id: biz.id,
        requester_user_id: authUser.id,
        requester_name: name,
        requester_email: authUser.email,
        requester_phone: detailsPhone.trim() || null,
      })
      .select("id, status, requester_phone")
      .single();
    if (!error && data) {
      setExistingClaim(data as any);
    } else if (error && !/duplicate|unique/i.test(error.message)) {
      setSubmitting(false);
      toast({ title: "Could not start claim", description: error.message, variant: "destructive" });
      return;
    }
    setDetailsOpen(false);
    startCheckout(biz.id);
  };

  const saveOptionalPhone = async () => {
    if (!existingClaim || !phoneText.trim()) return;
    setPhoneSaving(true);
    const { data, error } = await (supabase as any).rpc("update_my_claim_request_phone", {
      _claim_request_id: existingClaim.id,
      _requester_phone: phoneText.trim(),
    });
    setPhoneSaving(false);
    if (error) {
      toast({ title: "Could not save phone", description: error.message, variant: "destructive" });
      return;
    }
    setExistingClaim({ ...(data as any), requester_phone: (data as any)?.requester_phone ?? phoneText.trim() });
    toast({ title: "Saved", description: "We'll text you when your page goes live." });
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
            We verify ownership within 24 hours, then your page goes live.
          </p>

          {!existingClaim?.requester_phone && (
            <Card className="mt-8 p-5 text-left space-y-3">
              <label htmlFor="claim-phone" className="block text-sm font-semibold">
                Where should we text you when your page goes live?
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="claim-phone"
                  value={phoneText}
                  onChange={(e) => setPhoneText(e.target.value)}
                  placeholder="Mobile number (optional)"
                  inputMode="tel"
                  autoComplete="tel"
                  className="min-h-[48px] text-base"
                />
                <Button onClick={saveOptionalPhone} disabled={phoneSaving || !phoneText.trim()} className="min-h-[48px]">
                  {phoneSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setExistingClaim((claim) => claim ? { ...claim, requester_phone: "skipped" } : claim)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Skip for now
              </button>
            </Card>
          )}

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

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border/70">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-serif font-semibold tracking-tight">Claim {biz.business_name}</DialogTitle>
            <DialogDescription>
              One tap with Google — you'll confirm your details next.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              onClick={continueWithGoogle}
              disabled={submitting || emailSubmitting}
              className="w-full h-14 text-base font-bold bg-[#6B5BFF] hover:bg-[#5b4bf0]"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-2">
                  <GoogleGlyph /> Continue with Google
                </span>
              )}
            </Button>

            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>or email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={continueWithEmailPassword} className="space-y-2">
              <Input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@business.com"
                autoComplete="email"
                className="min-h-[44px] text-sm"
              />
              <Input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password"
                autoComplete={emailMode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                className="min-h-[44px] text-sm"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={emailSubmitting || submitting || !authEmail.trim() || !authPassword}
                className="w-full h-11 text-sm"
              >
                {emailSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {emailMode === "signup" ? "Create account" : "Sign in"}
                  </span>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setEmailMode((m) => (m === "signup" ? "signin" : "signup"))}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                {emailMode === "signup" ? "Have an account? Sign in" : "New here? Create an account"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={(open) => !submitting && setDetailsOpen(open)}>
        <DialogContent className="max-w-sm rounded-2xl border-border/70">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-serif font-semibold tracking-tight">Almost there</DialogTitle>
            <DialogDescription>
              Confirm who's claiming {biz.business_name}. Next step is secure checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Your name</label>
              <Input
                value={detailsName}
                onChange={(e) => setDetailsName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
                className="min-h-[48px] text-base"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Mobile (optional)</label>
              <Input
                value={detailsPhone}
                onChange={(e) => setDetailsPhone(e.target.value)}
                placeholder="For go-live text"
                inputMode="tel"
                autoComplete="tel"
                className="min-h-[48px] text-base"
              />
            </div>
            <Button
              onClick={confirmDetailsAndCheckout}
              disabled={submitting || !detailsName.trim()}
              className="w-full h-14 text-base font-bold bg-[#6B5BFF] hover:bg-[#5b4bf0]"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue to secure checkout →"}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              $97/mo · $500 setup <span className="line-through">waived</span> · cancel anytime
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
