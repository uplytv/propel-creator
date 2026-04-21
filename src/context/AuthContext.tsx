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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);

      if (session?.user) {
        setSentryUser(session.user.id);
        identifyUser(session.user.id, {
          email: session.user.email,
          created_at: session.user.created_at,
        });
        if (isNative() && event === 'SIGNED_IN') {
          // Fire-and-forget native push registration
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
        identifyUser(session.user.id, {
          email: session.user.email,
          created_at: session.user.created_at,
        });
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
