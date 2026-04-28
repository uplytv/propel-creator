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

/** Build the Spotify authorize URL with state encoding link slug */
export function buildSpotifyAuthUrl(linkSlug: string, fanEmail?: string): string {
  const state = btoa(JSON.stringify({ slug: linkSlug, email: fanEmail || null, t: Date.now() }));
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
