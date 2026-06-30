import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import ArtistSectionNav from "./ArtistSectionNav";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight } from "lucide-react";

/**
 * Artist-branded sign-in / sign-up. Creates a normal UPLY account but stamps
 * an `artist_affinity` claim in user_metadata so the artist's account page
 * knows which roster they came from.
 */
export default function ArtistSignInPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const artist = ARTIST_ROSTER.find((a) => a.slug === slug || (a.aliases ?? []).includes(slug));

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (artist) document.title = `Sign in · ${artist.displayName} on UPLY`;
  }, [artist]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && artist) navigate(`/${artist.slug}/account`, { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [artist, navigate]);

  if (!artist) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-center">
          <p className="opacity-60">Artist not found.</p>
          <Link to="/roster" className="underline mt-2 inline-block">Browse roster</Link>
        </div>
      </main>
    );
  }

  const accent = artist.accent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/${artist.slug}/account`,
            data: { artist_affinity: artist.slug, signup_source: `artist:${artist.slug}` },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/${artist.slug}/account`,
      });
      if (result.error) toast.error("Google sign-in failed.");
    } catch {
      toast.error("Google sign-in failed.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <ArtistSectionNav artist={artist} />
      <section
        className="px-6 pt-14 pb-10 text-center"
        style={{ background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)` }}
      >
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>
          {artist.displayName} · Member sign-in
        </p>
        <h1 className="mt-3 font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(36px, 7vw, 60px)" }}>
          Your {artist.displayName} account
        </h1>
        <p className="mt-3 max-w-md mx-auto text-[15px] opacity-80">
          One UPLY account unlocks {artist.displayName}'s community, courses, presales, and direct updates.
        </p>
      </section>

      <div className="max-w-[440px] mx-auto px-6 py-12">
        <div className="rounded-3xl p-6 sm:p-7 bg-white/5 border border-white/10">
          <div className="flex gap-2 mb-6 p-1 rounded-full bg-white/5 border border-white/10">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 h-9 rounded-full text-[13px] font-semibold transition-colors"
                style={mode === m ? { background: accent, color: "#0a0a0a" } : { color: "rgba(255,255,255,0.7)" }}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full h-11 rounded-full bg-white text-[#0a0a0a] font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] opacity-50">
            <div className="flex-1 h-px bg-white/15" /> or email <div className="flex-1 h-px bg-white/15" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.2em] opacity-60">Email</span>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-black/40 border border-white/10 text-[16px] outline-none focus:border-white/30"
                  placeholder="you@example.com"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.2em] opacity-60">Password</span>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-black/40 border border-white/10 text-[16px] outline-none focus:border-white/30"
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: accent, color: "#0a0a0a" }}
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] opacity-50">
            Powered by UPLY · One account works across every artist on the platform.
          </p>
        </div>

        <p className="mt-4 text-center text-[12px] opacity-60">
          Already have a UPLY account?{" "}
          <Link to={`/auth?redirect=/${artist.slug}/account`} className="underline">
            Use the main sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
