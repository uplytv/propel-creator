import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SENSITIVE_ACTION_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Hook that guards sensitive actions (password change, Stripe onboarding, etc.)
 * by requiring the user to re-enter their password if their session is older than 10 minutes.
 */
export function useReauthGuard() {
  const { session } = useAuth();
  const [showReauth, setShowReauth] = useState(false);
  const [reauthLoading, setReauthLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requireReauth = useCallback(
    (action: () => void) => {
      if (!session) return;

      // Check how old the current session is
      const issuedAt = session.access_token
        ? JSON.parse(atob(session.access_token.split(".")[1])).iat * 1000
        : 0;
      const sessionAge = Date.now() - issuedAt;

      if (sessionAge < SENSITIVE_ACTION_MAX_AGE_MS) {
        // Session is fresh enough — proceed
        action();
      } else {
        // Session is stale — require re-auth
        setPendingAction(() => action);
        setShowReauth(true);
      }
    },
    [session]
  );

  const confirmReauth = useCallback(
    async (password: string) => {
      if (!session?.user?.email) return false;
      setReauthLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password,
      });

      setReauthLoading(false);

      if (error) {
        toast.error("Authentication failed", { description: "Incorrect password. Please try again." });
        return false;
      }

      setShowReauth(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      return true;
    },
    [session, pendingAction, toast]
  );

  const cancelReauth = useCallback(() => {
    setShowReauth(false);
    setPendingAction(null);
  }, []);

  return {
    showReauth,
    reauthLoading,
    requireReauth,
    confirmReauth,
    cancelReauth,
  };
}
