// Spotify OAuth configuration (Client ID is public — safe to ship in browser code)
export const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";

// Scopes for the standard pre-save flow
export const SPOTIFY_PRESAVE_SCOPES = [
  "user-library-modify",
  "user-library-read",
  "user-read-email",
  "user-read-private",
].join(" ");

// Scopes for the "follow to unlock" flow
export const SPOTIFY_FOLLOW_SCOPES = [
  "user-follow-modify",
  "user-read-email",
  "user-read-private",
].join(" ");

// Back-compat alias used by older code paths
export const SPOTIFY_SCOPES = SPOTIFY_PRESAVE_SCOPES;

/** Build the redirect URI for the current origin */
export function getSpotifyRedirectUri(): string {
  return `${window.location.origin}/presave/callback`;
}

type SpotifyFlow = "presave" | "follow";

function generateNonce(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildAuthUrl(linkSlug: string, fanEmail: string | undefined, flow: SpotifyFlow): string {
  const nonce = generateNonce();
  const statePayload = {
    slug: linkSlug,
    email: fanEmail || null,
    nonce,
    flow,
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
    scope: flow === "follow" ? SPOTIFY_FOLLOW_SCOPES : SPOTIFY_PRESAVE_SCOPES,
    state,
    show_dialog: "false",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/** Build the Spotify authorize URL for a pre-save (default flow). */
export function buildSpotifyAuthUrl(linkSlug: string, fanEmail?: string): string {
  return buildAuthUrl(linkSlug, fanEmail, "presave");
}

/** Build the Spotify authorize URL for a follow-to-unlock flow. */
export function buildSpotifyFollowUrl(linkSlug: string, fanEmail?: string): string {
  return buildAuthUrl(linkSlug, fanEmail, "follow");
}
