// Spotify OAuth configuration (Client ID is public — safe to ship in browser code)
export const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";

export const SPOTIFY_SCOPES = [
  "user-library-modify",
  "user-library-read",
  "user-read-email",
  "user-read-private",
].join(" ");

/** Build the redirect URI for the current origin */
export function getSpotifyRedirectUri(): string {
  return `${window.location.origin}/presave/callback`;
}

/** Build the Spotify authorize URL with state encoding link slug + CSRF nonce */
export function buildSpotifyAuthUrl(linkSlug: string, fanEmail?: string): string {
  const nonce = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  const statePayload = {
    slug: linkSlug,
    email: fanEmail || null,
    nonce,
    t: Date.now(),
  };
  const state = btoa(JSON.stringify(statePayload));

  // Persist nonce so the callback page can verify it (CSRF protection)
  try {
    sessionStorage.setItem("spotify_presave_nonce", nonce);
    sessionStorage.setItem("spotify_presave_slug", linkSlug);
  } catch {
    // sessionStorage may be unavailable (Safari private mode, etc.) — fall back to no-verify
  }

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: getSpotifyRedirectUri(),
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "false",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
