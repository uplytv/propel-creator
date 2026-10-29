import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";
import { identifyUser, resetPostHog } from "@/lib/posthog";
import { registerNativePush } from "@/lib/native/pushNotifications";
import { isNative } from "@/lib/native/platform";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const enrichIdentify = async (userId: string, email?: string | null) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('tier, role_type, creator_type, onboarding_complete')
          .eq('user_id', userId)
          .maybeSingle();
        identifyUser(userId, {
          tier: data?.tier ?? null,
          role_type: data?.role_type ?? null,
          creator_type: data?.creator_type ?? null,
          onboarding_complete: data?.onboarding_complete ?? null,
        });
      } catch {
        identifyUser(userId, {});
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);

      if (session?.user) {
        setSentryUser(session.user.id);
        // Defer DB call out of the auth callback (Supabase best practice)
        setTimeout(() => enrichIdentify(session.user.id, session.user.email), 0);
        if (isNative() && event === 'SIGNED_IN') {
          registerNativePush(session.user.id).catch((e) =>
            console.error('[push] native registration failed', e)
          );
        }
      } else {
        clearSentryUser();
        if (event === 'SIGNED_OUT') {
          resetPostHog();
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        setSentryUser(session.user.id);
        setTimeout(() => enrichIdentify(session.user.id, session.user.email), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearSentryUser();
    resetPostHog();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
