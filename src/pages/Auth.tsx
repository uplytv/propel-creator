import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { getAffiliateCookie, clearAffiliateCookie, getReferralData } from "@/lib/affiliateCookies";
import { validatePassword } from "@/lib/passwordValidation";
import { trackEvent } from "@/lib/posthog";
import { Sentry } from "@/lib/sentry";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const defaultTab = (() => {
    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "signup") return "signup";
    return getAffiliateCookie("uply_waitlist_ref") || getAffiliateCookie("uply_invite_code") ? "signup" : "signin";
  })();
  const [tab, setTab] = useState<string>(defaultTab);

  // Post-auth redirect target. Accepts `redirect=` (existing UPLY convention)
  // and `next=` (used by the MCP OAuth consent page at
  // /.lovable/oauth/consent so it can round-trip through /auth and land back
  // on the consent screen). Only same-origin relative paths are allowed.
  const redirectParam = (() => {
    const q = new URLSearchParams(location.search);
    const raw = q.get("redirect") ?? q.get("next");
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  })();
  const returnTo = redirectParam ? `${window.location.origin}${redirectParam}` : window.location.origin;

  // Member (free-account) entry: /auth?mode=signup&as=member&redirect=...
  // Members skip creator onboarding + the approval waitlist entirely.
  const asMember = new URLSearchParams(location.search).get("as") === "member";

  useEffect(() => {
    if (signUpSuccess) return;
    const checkAndRedirect = async (session: any) => {
      if (!session) return;
      // Check if user needs onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, is_approved, account_type")
        .eq("user_id", session.user.id)
        .single();
      const p = profile as any;
      // Members (free accounts) bypass creator onboarding + the approval
      // waitlist: straight to their destination. `as=member` records the
      // persona on first pass; a stored 'member' persona covers later
      // sign-ins without the param.
      if (asMember || p?.account_type === "member") {
        // Record the persona only for pristine profiles (fresh signups).
        // A creator who signs in through a member CTA link must never be
        // downgraded — onboarding_complete/is_approved mark the creator path.
        if (asMember && p?.account_type !== "member" && !p?.onboarding_complete && !p?.is_approved) {
          await supabase
            .from("profiles")
            .update({ account_type: "member" })
            .eq("user_id", session.user.id);
        }
        navigate(redirectParam || "/discover", { replace: true });
        return;
      }
      if (!p?.onboarding_complete) {
        navigate("/onboarding", { replace: true });
      } else if (p?.is_approved) {
        navigate(redirectParam || "/discover", { replace: true });
      } else {
        navigate("/waitlist", { replace: true });
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !signUpSuccess) checkAndRedirect(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !signUpSuccess) checkAndRedirect(session);
    });
    return () => subscription.unsubscribe();
  }, [navigate, signUpSuccess, redirectParam, asMember]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(password);
    if (pwError) {
      toast.error("Weak password", { description: pwError });
      return;
    }
    setLoading(true);
    const allowed = await checkServerRateLimit("signup");
    if (!allowed) { setLoading(false); return; }

    // Check for platform referral cookie and creator affiliate cookie
    const refCode = getAffiliateCookie("uply_ref");
    const creatorRefCode = getAffiliateCookie("uply_creator_ref");
    // Also capture waitlist referral data for profile attribution
    const waitlistRef = getReferralData();

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: returnTo,
        data: {
          full_name: name,
          referred_by: waitlistRef.code || refCode || creatorRefCode || undefined,
          referrer_username: waitlistRef.username || undefined,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Sign up failed", { description: error.message });
    } else {
      // Track platform referral conversion
      if (refCode && signUpData?.user) {
        try {
          await supabase.functions.invoke("track-affiliate-conversion", {
            body: {
              affiliate_code: refCode,
              referred_user_id: signUpData.user.id,
              conversion_type: "signup",
            },
          });
          clearAffiliateCookie("uply_ref");
        } catch (err) {
          Sentry.captureException(err, { tags: { context: "platform_affiliate_tracking" } });
        }
      }
      // Track creator affiliate conversion
      if (creatorRefCode && signUpData?.user) {
        try {
          await supabase.functions.invoke("track-affiliate-conversion", {
            body: {
              affiliate_code: creatorRefCode,
              referred_user_id: signUpData.user.id,
              conversion_type: "signup",
            },
          });
          clearAffiliateCookie("uply_creator_ref");
        } catch (err) {
          Sentry.captureException(err, { tags: { context: "creator_affiliate_tracking" } });
        }
      }
      trackEvent("signup_completed", { method: "email", has_referral: !!(refCode || creatorRefCode), as_member: asMember });
      // Auto-confirm is enabled — if session exists, redirect immediately
      if (signUpData?.session) {
        toast.success("Account created!", { description: "Welcome to UPLY!" });
        if (asMember) {
          // Free member account: record the persona and skip creator
          // onboarding/waitlist. Idempotent with checkAndRedirect's write.
          await supabase
            .from("profiles")
            .update({ account_type: "member" })
            .eq("user_id", signUpData.user.id);
          navigate(redirectParam || "/discover", { replace: true });
          return;
        }
        navigate("/onboarding", { replace: true });
        return;
      }
      setSignUpSuccess(true);
    }
  };

  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const checkServerRateLimit = async (actionType: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("auth-rate-check", {
        body: { identifier: email.toLowerCase().trim(), action_type: actionType },
      });
      if (error || !data) return true; // fail open
      if (!data.allowed) {
        const retryAfter = data.retry_after || 60;
        toast.error("Too many attempts", {
          description: `Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
        });
        return false;
      }
      return true;
    } catch {
      return true; // fail open
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const secsLeft = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast.error("Too many attempts", { description: `Please wait ${secsLeft}s before trying again.` });
      return;
    }
    setLoading(true);
    const allowed = await checkServerRateLimit("login");
    if (!allowed) { setLoading(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      const isUnconfirmed = error.message?.toLowerCase().includes("email not confirmed");
      const isInvalidCreds = error.message?.toLowerCase().includes("invalid login credentials") || error.message?.toLowerCase().includes("invalid credentials");
      if (isUnconfirmed) {
        toast.error("Email not verified", {
          description: `Check your inbox at ${email} for a confirmation link. Don't forget to check spam.`,
          duration: 8000,
        });
        setShowResendConfirm(true);
      } else if (newAttempts >= 5) {
        const lockDuration = Math.min(30 * Math.pow(2, Math.floor((newAttempts - 5) / 3)), 300) * 1000;
        setLockoutUntil(Date.now() + lockDuration);
        toast.error("Account locked", { description: `Too many failed attempts. Try again in ${lockDuration / 1000}s.` });
      } else {
        if (isInvalidCreds) setShowResendConfirm(true);
        toast.error("Sign in failed", { description: error.message });
      }
    } else {
      setLoginAttempts(0);
      setLockoutUntil(null);
      setShowResendConfirm(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
    setResendLoading(false);
    if (error) {
      toast.error("Could not resend", { description: error.message });
    } else {
      toast.success("Confirmation email sent", { description: `Check your inbox at ${email}. Don't forget to check spam.`, duration: 8000 });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: returnTo,
    });

    if (result.error) {
      setLoading(false);
      toast.error("Google sign in failed", { description: String(result.error) });
      return;
    }

    if (result.redirected) {
      // Browser will redirect to Google — just return and let it happen
      return;
    }

    // Tokens were returned and session is already set — user is authenticated
    // The onAuthStateChange listener above will handle navigation
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Error", { description: "Please enter your email address." });
      return;
    }
    setForgotLoading(true);
    const allowed = await checkServerRateLimit("password_reset");
    if (!allowed) { setForgotLoading(false); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error("Error", { description: error.message });
    } else {
      toast.success("Reset email sent", { description: "Check your inbox for the password reset link." });
      setForgotMode(false);
    }
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
               <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription className="mt-2">
                We've sent a verification link to <strong>{email}</strong>. Please check your inbox (and spam folder) and click the link to verify your account before signing in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Didn't get the email? Check your spam/junk folder. It may take a minute to arrive.</span>
              </div>
              <Button variant="outline" className="w-full" onClick={handleResendConfirmation} disabled={resendLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${resendLoading ? "animate-spin" : ""}`} />
                {resendLoading ? "Sending..." : "Resend Confirmation Email"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setSignUpSuccess(false)}>
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {tab === "signup" ? "Create your free account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {tab === "signup"
                ? asMember
                  ? "Join communities, take free courses, and support creators. No card required."
                  : "Keep 95% of what you earn. No card required."
                : asMember
                  ? "Sign in to your account"
                  : "Sign in to your creator dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter your email and we'll send you a password reset link.</p>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>
                  Back to Sign In
                </Button>
              </form>
            ) : (
              <>
                <Button variant="outline" className="w-full mb-6" onClick={handleGoogleSignIn} disabled={loading}>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="hsl(220 90% 56%)" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="hsl(var(--success))" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="hsl(var(--warning))" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="hsl(var(--destructive))" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signin-email" type="email" placeholder="you@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signin-password" type="password" placeholder="••••••••" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                      </Button>
                      <button type="button" onClick={() => setForgotMode(true)} className="w-full text-xs text-primary hover:underline text-center">
                        Forgot your password?
                      </button>
                      {showResendConfirm && (
                        <div className="mt-2 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                          <p className="text-xs text-muted-foreground">Haven't verified your email yet? We can resend the confirmation link.</p>
                          <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleResendConfirmation} disabled={resendLoading}>
                            <RefreshCw className={`w-3 h-3 mr-2 ${resendLoading ? "animate-spin" : ""}`} />
                            {resendLoading ? "Sending..." : "Resend Confirmation Email"}
                          </Button>
                        </div>
                      )}
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-name" type="text" placeholder="Your name" className="pl-9" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-email" type="email" placeholder="you@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                        </div>
                        {password && (
                          <div className="text-xs space-y-0.5 mt-1">
                            <p className={password.length >= 8 ? "text-green-600" : "text-muted-foreground"}>✓ At least 8 characters</p>
                            <p className={/[A-Z]/.test(password) ? "text-green-600" : "text-muted-foreground"}>✓ One uppercase letter</p>
                            <p className={/[0-9]/.test(password) ? "text-green-600" : "text-muted-foreground"}>✓ One number</p>
                          </div>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
