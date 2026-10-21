/**
 * Build a referral URL using the new /join/[username]/[code] format.
 * Falls back to /join/[code] if username is unavailable.
 */
export function buildReferralUrl(code: string, username?: string | null): string {
  const base = "https://uply.tv";
  if (username) {
    const slug = username.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `${base}/join/${slug}/${code}`;
  }
  return `${base}/join/${code}`;
}

/** Display version (without https://) */
export function buildReferralUrlDisplay(code: string, username?: string | null): string {
  if (username) {
    const slug = username.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `uply.tv/join/${slug}/${code}`;
  }
  return `uply.tv/join/${code}`;
}

/** Get the first name from a display name */
export function getFirstName(displayName?: string | null, fallback = "Someone"): string {
  if (!displayName) return fallback;
  return displayName.split(" ")[0] || fallback;
}

/** Platform-specific share messages */
export function getShareMessages(firstName: string, fullUrl: string) {
  return {
    sms: `${firstName} invited you to join UPLY , it's like YouTube but you actually get paid. Use their invite link and you both move up the waitlist: ${fullUrl}`,
    twitter: `${firstName} just invited me to @uplyTV , the creator platform where you actually get paid for your audience. Live streaming, community, courses all in one place. Join the waitlist: ${fullUrl}`,
    linkedin: `I just got early access to UPLY and wanted to personally invite you. It's the all-in-one creator platform combining live streaming, community, and courses , Free includes community, courses and events. Use my invite link: ${fullUrl}`,
    instagram: `${firstName} personally invited you to UPLY. Like YouTube but you actually get paid 💰 Join the waitlist with their link and you both move up 👉 ${fullUrl.replace("https://", "")}`,
  };
}
