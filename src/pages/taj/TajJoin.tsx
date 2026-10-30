import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { memberAuthUrl } from "@/lib/memberAuth";
import { validatePassword } from "@/lib/passwordValidation";
import TierSelectionModal from "@/components/TierSelectionModal";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { TajShell, Display, Eyebrow, cinzel, gold } from "./shell";
import { useTajMembership } from "./useTajMembership";
import { BRAND, MEMBERSHIP, PROGRAMS, WHO } from "./content";

export default function TajJoin() {
  const { user, creatorId, tiers, joining, member, showTiers, setShowTiers, confirmMembership } = useTajMembership();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const autoConfirmed = useRef(false);

  useEffect(() => {
    if (params.get("confirm") !== "1" || !user || member || autoConfirmed.current) return;
    autoConfirmed.current = true;
    confirmMembership();
  }, [params, user, member, confirmMembership]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Enter a valid email.");
      return;
    }
    if (mode === "signup") {
      const pwError = validatePassword(password);
      if (pwError) {
        toast.error(pwError);
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/taj/join?confirm=1`,
            data: {
              full_name: name.trim() || undefined,
              signup_source: "taj-fencing",
              taj_club_member: true,
            },
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          toast.success("Account created");
          await confirmMembership(data.user);
        } else {
          toast.success("Check your email to confirm, then you'll land back here to finish joining.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Signed in");
        await confirmMembership();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't continue");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/taj/join?confirm=1`,
    });
    if (result && "error" in result && result.error) {
      toast.error("Google sign-in didn't start. Use email, or the UPLY sign-in link below.");
    }
  }

  const field =
    "w-full h-12 px-4 bg-transparent border border-white/20 text-[16px] text-[#F4EFE6] placeholder:text-white/35 outline-none focus:border-[#E4C98A]";

  return (
    <TajShell>
      <SEOHead
        title="Join TAJ Fencing Club"
        description="Join TAJ Fencing Club in Reston, VA. Club membership · $1,500. Ages 5+, beginners through competitive épée. Equipment provided for beginners."
      />
      <TierSelectionModal
        open={showTiers}
        onClose={() => setShowTiers(false)}
        creatorId={creatorId || ""}
        tiers={tiers.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description || "",
          price_monthly: t.price_monthly,
          price_yearly: t.price_yearly,
          stripe_price_id: t.stripe_price_id || "",
        }))}
      />

      <section className="relative overflow-hidden">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-14 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-start">
          <div>
            <Eyebrow>Join us</Eyebrow>
            <h1 className="text-[40px] sm:text-[60px] leading-[0.95]" style={cinzel}>
              Train with excellence.
              <br />
              Fence your limits.
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-white/78 max-w-xl">
              Whether you are stepping onto the strip for the first time or pursuing competitive success, TAJ Fencing Club provides a professional training environment where athletes of all ages can develop confidence, discipline, and excellence through the sport of fencing.
            </p>
            <p className="mt-4 text-[15px] text-white/70">No previous fencing experience is required.</p>

            <div className="mt-10 border border-[#E4C98A]/45 p-6 sm:p-8" style={{ background: "#10131A" }}>
              <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: gold }}>{MEMBERSHIP.label}</p>
              <p className="mt-2 text-[52px] leading-none" style={cinzel}>{MEMBERSHIP.priceLabel}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-white/65">{MEMBERSHIP.note}</p>
              {tiers.length > 0 && (
                <p className="mt-3 text-[13px] text-white/80">
                  A live UPLY plan is published for this club. Join opens that checkout.
                </p>
              )}
              {creatorId && (
                <Link to={`/community/${creatorId}/classroom`} className="mt-3 inline-block text-[13px] underline" style={{ color: gold }}>
                  Open the club space on UPLY
                </Link>
              )}
            </div>
          </div>

          <div id="membership" className="scroll-mt-28 border border-[#E4C98A]/30 p-6 sm:p-8" style={{ background: "#0C0E14" }}>
            {member ? (
              <div>
                <Display className="text-[32px]">You're in Taj Club.</Display>
                <p className="mt-3 text-[15px] text-white/75">{MEMBERSHIP.display} is on your UPLY account.</p>
                <Link
                  to="/taj/classroom"
                  className="mt-6 h-12 px-6 inline-flex items-center text-[12px] tracking-[0.16em] uppercase font-semibold"
                  style={{ background: gold, color: "#1A140C" }}
                >
                  Go to the classroom
                </Link>
              </div>
            ) : user ? (
              <div>
                <Display className="text-[32px]">Confirm your place.</Display>
                <p className="mt-3 text-[15px] text-white/75">
                  Signed in as {user.email}. Join uses your UPLY account
                  {tiers.length > 0 ? " and the club's live plan." : "."}
                </p>
                <button
                  type="button"
                  disabled={joining}
                  onClick={() => confirmMembership()}
                  className="mt-6 h-12 w-full text-[12px] tracking-[0.16em] uppercase font-semibold disabled:opacity-60"
                  style={{ background: gold, color: "#1A140C" }}
                >
                  {joining ? "Joining…" : "Join Taj Club"}
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <Display className="text-[32px]">Join Taj Club</Display>
                <p className="mt-2 text-[14px] text-white/65">
                  Create a free UPLY member account, then your club place is confirmed. Same sign-in the rest of UPLY uses.
                </p>
                <div className="mt-5 grid grid-cols-2 border border-white/15">
                  {(["signup", "signin"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className="h-10 text-[12px] tracking-[0.14em] uppercase"
                      style={{ background: mode === m ? gold : "transparent", color: mode === m ? "#1A140C" : "rgba(244,239,230,0.7)" }}
                    >
                      {m === "signup" ? "Create account" : "Sign in"}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-3">
                  {mode === "signup" && (
                    <input className={field} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  )}
                  <input className={field} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  <input className={field} type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                </div>
                <button
                  type="submit"
                  disabled={busy || joining}
                  className="mt-4 h-12 w-full text-[12px] tracking-[0.16em] uppercase font-semibold disabled:opacity-60"
                  style={{ background: gold, color: "#1A140C" }}
                >
                  {busy || joining ? "Working…" : "Join Taj Club"}
                </button>
                <button type="button" onClick={google} className="mt-3 h-11 w-full text-[12px] tracking-[0.14em] uppercase border border-white/20">
                  Continue with Google
                </button>
                <Link to={memberAuthUrl("/taj/join?confirm=1")} className="mt-4 block text-center text-[13px] text-white/60 underline">
                  Use the standard UPLY sign-in
                </Link>
              </form>
            )}
            <div className="mt-6 flex flex-col gap-2 text-[14px]">
              <a href={BRAND.whatsapp} target="_blank" rel="noreferrer" className="hover:text-[#E4C98A]">WhatsApp the club</a>
              <a href={BRAND.emailHref} className="hover:text-[#E4C98A]">Email {BRAND.email}</a>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-16 grid md:grid-cols-2 gap-10">
        <div>
          <Eyebrow>Who can join</Eyebrow>
          <ul className="grid gap-2">
            {WHO.map((w) => (
              <li key={w} className="border-b border-white/10 py-2 text-[15px]">{w}</li>
            ))}
          </ul>
        </div>
        <div>
          <Eyebrow>Schedule</Eyebrow>
          {BRAND.hours.map((h) => (
            <p key={h.day} className="flex justify-between gap-4 border-b border-white/10 py-3 text-[15px]">
              <span>{h.day}</span>
              <span style={{ color: gold }}>{h.time}</span>
            </p>
          ))}
          <p className="mt-4 text-[14px] text-white/70">{BRAND.address}</p>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-8">
        <Eyebrow>Programs included in the club</Eyebrow>
        <div className="grid md:grid-cols-2 gap-4">
          {PROGRAMS.map((p) => (
            <article key={p.title} className="border border-white/10 p-5">
              <h2 className="text-[22px]" style={cinzel}>{p.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-white/70">{p.copy}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-[15px] text-white/75">
          New and beginner students are provided with fencing equipment during training sessions.
        </p>
      </section>
    </TajShell>
  );
}
