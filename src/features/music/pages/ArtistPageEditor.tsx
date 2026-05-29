import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as any;

/**
 * Editor entry point.
 *
 * The "editor" is now the public profile in owner mode: the live page IS the
 * editor (inline cover/bio sheets are rendered by `InlineEditMenu` inside
 * `SocialCreatorPage` when the viewer is the owner). So this route just
 * redirects the owner to `/@<their-slug>`.
 *
 * If the owner hasn't picked a vanity slug yet (or has no `artist_profiles`
 * row), we fall through to the legacy form at `./advanced` so they can set one.
 */
export default function ArtistPageEditor() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "redirect"; slug: string }
    | { kind: "no-slug" }
    | { kind: "forbidden" }
  >({ kind: "loading" });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !id || user.id !== id) {
      setState({ kind: "forbidden" });
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: artist }, { data: profile }] = await Promise.all([
        sb
          .from("artist_profiles")
          .select("vanity_slug")
          .eq("user_id", id)
          .maybeSingle(),
        sb
          .from("profiles")
          .select("username")
          .eq("user_id", id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const slug = artist?.vanity_slug || profile?.username || null;
      if (slug) setState({ kind: "redirect", slug });
      else setState({ kind: "no-slug" });
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, id]);

  if (state.kind === "loading") {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }
  if (state.kind === "forbidden") {
    return (
      <div className="p-6 text-foreground">Not authorized.</div>
    );
  }
  if (state.kind === "redirect") {
    return <Navigate to={`/@${state.slug}`} replace />;
  }
  // No slug yet — nudge to advanced form.
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Pick your handle to get started</h1>
        <p className="text-muted-foreground text-sm">
          Your public page lives at <span className="font-mono">uply.tv/@yourhandle</span>.
          Set it once and your profile becomes editable inline.
        </p>
        <Link
          to={`/music/artist/${id}/edit/advanced`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
        >
          Set up handle
        </Link>
      </div>
    </div>
  );
}
