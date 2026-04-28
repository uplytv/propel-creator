import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSpotifyRedirectUri } from "@/lib/spotifyConfig";
import { Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PresaveCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Saving to your Spotify library...");
  const [linkInfo, setLinkInfo] = useState<{ title?: string; artist?: string; cover?: string }>({});
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const code = params.get("code");
    const stateParam = params.get("state");
    const error = params.get("error");

    if (error || !code || !stateParam) {
      setStatus("error");
      setMessage(error || "Missing authorization code");
      return;
    }

    let parsedState: { slug: string; email: string | null; nonce?: string };
    try {
      parsedState = JSON.parse(atob(stateParam));
    } catch {
      setStatus("error");
      setMessage("Invalid state");
      return;
    }

    // CSRF verification: compare nonce to value stored when we built the auth URL.
    try {
      const storedNonce = sessionStorage.getItem("spotify_presave_nonce");
      if (storedNonce && parsedState.nonce && storedNonce !== parsedState.nonce) {
        setStatus("error");
        setMessage("Invalid state — please try again");
        return;
      }
      sessionStorage.removeItem("spotify_presave_nonce");
      sessionStorage.removeItem("spotify_presave_slug");
    } catch {
      // sessionStorage unavailable — proceed without strict CSRF (legacy behavior)
    }

    (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke("spotify-presave-callback", {
        body: {
          code,
          redirect_uri: getSpotifyRedirectUri(),
          link_slug: parsedState.slug,
          fan_email: parsedState.email || undefined,
        },
      });

      if (fnErr || data?.error) {
        setStatus("error");
        setMessage(data?.error || fnErr?.message || "Something went wrong");
        return;
      }

      setLinkInfo({
        title: data.title,
        artist: data.artist,
        cover: data.cover_image_url,
      });
      setStatus("success");
      setMessage(
        data.converted
          ? "Saved to your Spotify library! 🎉"
          : "You're all set — we'll save it the moment it drops."
      );

      setTimeout(() => {
        navigate(`/link/${parsedState.slug}`);
      }, 3500);
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold mb-2">Almost there...</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            {linkInfo.cover && (
              <img
                src={linkInfo.cover}
                alt={linkInfo.title}
                className="w-32 h-32 mx-auto rounded-xl mb-4 object-cover"
              />
            )}
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold mb-2">
              {linkInfo.title || "All set!"}
            </h1>
            {linkInfo.artist && <p className="text-muted-foreground mb-3">{linkInfo.artist}</p>}
            <p className="text-foreground font-medium">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">{message}</p>
            <Button onClick={() => navigate("/")}>Go home</Button>
          </>
        )}
      </div>
    </div>
  );
}
