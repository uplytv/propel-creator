import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, ArrowLeft, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let resolved = false;

    const resolve = () => {
      if (resolved) return;
      resolved = true;
      setIsRecovery(true);
      setChecking(false);
    };

    // 1) Check URL hash for recovery token fragments
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      resolve();
    }

    // 2) Check URL search params (some flows use ?type=recovery)
    const params = new URLSearchParams(window.location.search);
    if (params.get("type") === "recovery") {
      resolve();
    }

    // 3) Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolve();
      }
    });

    // 4) Check if there's already a valid session (token was already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !resolved) {
        // User has a session — if they landed here, treat as recovery
        // (Supabase already exchanged the recovery token into a session)
        resolve();
      }
      if (!resolved) {
        // Give the auth state change listener a moment to fire
        setTimeout(() => {
          if (!resolved) {
            setChecking(false);
          }
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Your password has been reset successfully.");
      navigate("/dashboard", { replace: true });
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Back to Sign In
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth?tab=forgot")}>
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/auth")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="Min 8 characters" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="Repeat password" className="pl-9" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
