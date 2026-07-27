import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Star, Shield } from "lucide-react";

interface BusinessInfo {
  id: string;
  username: string;
  business_name: string;
  tagline: string | null;
  category: string | null;
  hero_image_url: string | null;
  business_status: string;
}

const BUSINESS_PRICE = 97;
const SETUP_FEE = 500;
const SETUP_FEE_WAIVED = true;

export default function ClaimBusinessPage() {
  const { username = "" } = useParams();
  const [params] = useSearchParams();
  const [biz, setBiz] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingClaim, setExistingClaim] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      setUserId(uid);
      if (sess.session?.user?.email) setEmail(sess.session.user.email);

      // Resolve business via the same anon-safe path as BusinessSitePage:
      // security-definer RPC (bypasses profile RLS) + anon-readable
      // business_details select. Never query the profiles table directly
      // here — that path is RLS-blocked for non-owner visitors.
      const candidates = getProfileHandleCandidates(username);
      const rpcResults = await Promise.all(
        candidates.map((candidate) =>
          supabase
            .rpc("get_public_profile_by_username", { _username: candidate })
            .maybeSingle(),
        ),
      );
      const p = rpcResults.find((r: any) => r?.data)?.data as
        | {
            id: string;
            user_id: string;
            username: string;
            account_type: string | null;
            business_status: string | null;
          }
        | undefined;

      if (!p || p.account_type !== "business") {
        setLoading(false);
        return;
      }

      const { data: d } = await supabase
        .from("business_details" as never)
        .select("business_name, tagline, category, hero_image_url")
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
      });

      if (uid) {
        const { data: existing } = await supabase
          .from("claim_requests")
          .select("id, status, created_at")
          .eq("business_id", p.id)
          .eq("requester_user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1);
        if (existing && existing.length) setExistingClaim(existing[0]);
      }
      setLoading(false);
    })();
  }, [username]);

  useEffect(() => {
    if (params.get("checkout") === "success") {
      toast({ title: "Subscription active", description: "Your claim is now pending admin review." });
    }
  }, [params]);

  const requiresAuth = !userId;

  const handleClaim = async () => {
    if (!biz) return;
    if (!name.trim() || !email.trim()) {
      toast({ title: "Missing info", description: "Name and email required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // 1) Insert claim request (pending)
      const { data: claim, error } = await supabase
        .from("claim_requests")
        .insert({
          business_id: biz.id,
          requester_user_id: userId!,
          requester_name: name.trim(),
          requester_email: email.trim(),
          requester_phone: phone.trim() || null,
          note: note.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // 2) Start Business subscription checkout
      const { data: co, error: coErr } = await supabase.functions.invoke(
        "create-business-claim-checkout",
        { body: { business_id: biz.id, claim_request_id: claim.id } },
      );
      if (coErr) throw coErr;
      if ((co as any)?.url) {
        window.location.href = (co as any).url;
      } else {
        throw new Error("Checkout URL missing");
      }
    } catch (e: any) {
      toast({ title: "Could not start claim", description: e.message, variant: "destructive" });
    } finally {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <p className="text-xs uppercase tracking-widest text-[#6B5BFF] font-bold mb-3">Claim your page</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {biz.business_name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          This page was built for your business on UPLY.
        </p>

        {/* Preview thumbnail */}
        <Card className="mt-6 overflow-hidden">
          <div className="relative h-40 sm:h-56 bg-gradient-to-br from-[#6B5BFF]/20 to-transparent">
            {biz.hero_image_url && (
              <img src={biz.hero_image_url} alt="" className="w-full h-full object-cover opacity-70" />
            )}
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-xs uppercase tracking-widest text-[#6B5BFF] font-bold">
                {biz.category ?? "Business"}
              </p>
              <h2 className="text-xl font-bold">{biz.business_name}</h2>
              {biz.tagline && <p className="text-sm text-muted-foreground line-clamp-1">{biz.tagline}</p>}
            </div>
          </div>
          <div className="p-4 text-sm text-muted-foreground flex items-center justify-between">
            <span>uply.tv/{biz.username}</span>
            <Link to={`/${biz.username}`} target="_blank" className="text-[#6B5BFF] hover:underline">
              Preview live page →
            </Link>
          </div>
        </Card>

        {/* Business plan */}
        <Card className="mt-6 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-[#6B5BFF] font-bold">UPLY Business</p>
              <p className="text-3xl font-extrabold mt-1">${BUSINESS_PRICE}<span className="text-base font-medium text-muted-foreground">/month</span></p>
              {SETUP_FEE_WAIVED ? (
                <p className="mt-2 text-sm">
                  <span className="line-through text-muted-foreground">${SETUP_FEE} setup fee</span>{" "}
                  <span className="font-bold text-[#6B5BFF]">WAIVED (limited time)</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  + one-time ${SETUP_FEE} setup fee (charged today)
                </p>
              )}
              <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground font-bold">What's included</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6B5BFF] shrink-0 mt-0.5" /> Your page at uply.tv/yourname</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6B5BFF] shrink-0 mt-0.5" /> Links page (replaces Linktree)</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6B5BFF] shrink-0 mt-0.5" /> Blog that ranks on Google</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6B5BFF] shrink-0 mt-0.5" /> Lead capture with instant email alerts</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6B5BFF] shrink-0 mt-0.5" /> Call & visit analytics</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6B5BFF] shrink-0 mt-0.5" /> Weekly performance report</li>
              </ul>
            </div>
            <Shield className="w-8 h-8 text-[#6B5BFF] shrink-0" />
          </div>
        </Card>

        {/* Claim form */}
        {existingClaim ? (
          <Card className="mt-6 p-5">
            <p className="font-semibold">
              Claim status: <span className="capitalize text-[#6B5BFF]">{existingClaim.status}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {existingClaim.status === "pending"
                ? "We've received your claim. An admin will review it shortly."
                : existingClaim.status === "approved"
                ? "Approved — your page is live under your account."
                : "This claim was not approved. Contact remove@uply.tv for questions."}
            </p>
          </Card>
        ) : requiresAuth ? (
          <Card className="mt-6 p-5">
            <p className="font-semibold mb-3">Sign in to claim</p>
            <p className="text-sm text-muted-foreground mb-4">
              You'll need a UPLY account to manage this page.
            </p>
            <Link to={`/auth?next=${encodeURIComponent(`/claim/${username}`)}`}>
              <Button className="w-full bg-[#6B5BFF] hover:bg-[#5b4bf0]">Sign up or sign in</Button>
            </Link>
          </Card>
        ) : (
          <Card className="mt-6 p-5 space-y-4">
            <p className="font-semibold">Your details</p>
            <Input placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Textarea
              placeholder="Anything we should know? (optional)"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              onClick={handleClaim}
              disabled={submitting}
              className="w-full bg-[#6B5BFF] hover:bg-[#5b4bf0] h-11"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (SETUP_FEE_WAIVED ? `Claim & subscribe — $${BUSINESS_PRICE}/mo (setup fee waived)` : `Claim & subscribe — $${SETUP_FEE} today, then $${BUSINESS_PRICE}/mo`)}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Payment starts today. Your page goes live once an admin approves the claim.
            </p>
          </Card>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Not your business?{" "}
          <a href="mailto:remove@uply.tv?subject=Takedown%20request" className="text-[#6B5BFF] hover:underline">
            remove@uply.tv
          </a>
        </p>
      </div>
    </div>
  );
}
