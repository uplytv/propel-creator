import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves /:username (and /:username/page) to the canonical /@<slug> social
 * creator page. Falls back to a 404 if no profile exists.
 *
 * If the profile has a vanity_slug on artist_profiles, that wins; otherwise we
 * use the username itself.
 */
export default function UsernameRedirect() {
  const { username } = useParams<{ username: string }>();
  const [target, setTarget] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!username) {
        setTarget(null);
        return;
      }
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("user_id, username")
        .eq("username", username)
        .maybeSingle();

      if (!profile) {
        if (!cancelled) setTarget(null);
        return;
      }

      const { data: artist } = await (supabase as any)
        .from("artist_profiles")
        .select("vanity_slug")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      const slug = artist?.vanity_slug || profile.username;
      if (!cancelled) setTarget(`/@${slug}`);
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (target === undefined) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }
  if (target === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
        <h1 className="text-3xl font-heading font-bold mb-3">Not found</h1>
        <p className="opacity-70 mb-6">
          No creator with the handle <span className="font-mono">@{username}</span>
        </p>
        <Link
          to="/discover"
          className="px-5 py-3 rounded-full font-semibold border border-border hover:bg-muted transition min-h-[44px] inline-flex items-center"
        >
          Discover creators
        </Link>
      </div>
    );
  }
  return <Navigate to={target} replace />;
}
