// ---- Cookie helpers ----

export function setAffiliateCookie(name: string, value: string, days: number = 30) {
  const maxAge = days * 86400;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
  // Also store in localStorage as backup — cookies can be lost during OAuth redirects
  try { localStorage.setItem(name, value); } catch {}
}

export function getAffiliateCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  if (match) return decodeURIComponent(match[2]);
  // Fallback to localStorage if cookie was lost (e.g. OAuth redirect)
  try { return localStorage.getItem(name); } catch { return null; }
}

export function clearAffiliateCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
  try { localStorage.removeItem(name); } catch {}
}

// ---- Bulletproof referral data reader (Steps 2 & 3) ----

export interface ReferralData {
  code: string | null;
  username: string | null;
  name: string | null;
}

/**
 * Reads referral data from cookie → localStorage → sessionStorage.
 * Returns the first non-null code found.
 */
export function getReferralData(): ReferralData {
  // Try cookie first
  const cookieCode = document.cookie.match(/uply_waitlist_ref=([^;]+)/)?.[1] || null;
  const cookieUsername = document.cookie.match(/uply_referrer_username=([^;]+)/)?.[1] || null;
  const cookieName = document.cookie.match(/uply_referrer_name=([^;]+)/)?.[1] || null;

  if (cookieCode) {
    
    return {
      code: decodeURIComponent(cookieCode),
      username: cookieUsername ? decodeURIComponent(cookieUsername) : null,
      name: cookieName ? decodeURIComponent(cookieName) : null,
    };
  }

  // Try localStorage
  try {
    const lsCode = localStorage.getItem('uply_waitlist_ref');
    const lsUsername = localStorage.getItem('uply_referrer_username');
    const lsName = localStorage.getItem('uply_referrer_name');
    if (lsCode) {
      console.log('Referral found in localStorage:', lsCode);
      return { code: lsCode, username: lsUsername, name: lsName };
    }
  } catch {}

  // Try sessionStorage
  try {
    const ssCode = sessionStorage.getItem('uply_waitlist_ref');
    const ssUsername = sessionStorage.getItem('uply_referrer_username');
    const ssName = sessionStorage.getItem('uply_referrer_name');
    if (ssCode) {
      console.log('Referral found in sessionStorage:', ssCode);
      return { code: ssCode, username: ssUsername, name: ssName };
    }
  } catch {}

  console.log('No referral data found in any storage method');
  return { code: null, username: null, name: null };
}

/**
 * Sets referral data to ALL three storage methods simultaneously.
 */
export function setReferralData(code: string, username?: string | null, displayName?: string | null): void {
  const maxAge = 30 * 86400; // 30 days

  // Method 1 — Cookie
  document.cookie = `uply_waitlist_ref=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
  if (username) document.cookie = `uply_referrer_username=${encodeURIComponent(username)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
  if (displayName) document.cookie = `uply_referrer_name=${encodeURIComponent(displayName)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

  // Method 2 — localStorage
  try {
    localStorage.setItem('uply_waitlist_ref', code);
    if (username) localStorage.setItem('uply_referrer_username', username);
    if (displayName) localStorage.setItem('uply_referrer_name', displayName);
  } catch {}

  // Method 3 — sessionStorage
  try {
    sessionStorage.setItem('uply_waitlist_ref', code);
    if (username) sessionStorage.setItem('uply_referrer_username', username);
    if (displayName) sessionStorage.setItem('uply_referrer_name', displayName);
  } catch {}

  console.log(`Referral stored in cookie, localStorage, and sessionStorage — code: ${code}, username: ${username}, name: ${displayName}`);
}

/**
 * Clears referral data from ALL three storage methods.
 */
export function clearReferralData(): void {
  // Clear cookies
  document.cookie = 'uply_waitlist_ref=; path=/; max-age=0';
  document.cookie = 'uply_referrer_username=; path=/; max-age=0';
  document.cookie = 'uply_referrer_name=; path=/; max-age=0';

  // Clear localStorage
  try {
    localStorage.removeItem('uply_waitlist_ref');
    localStorage.removeItem('uply_referrer_username');
    localStorage.removeItem('uply_referrer_name');
    localStorage.removeItem('uply_referrer_avatar');
  } catch {}

  // Clear sessionStorage
  try {
    sessionStorage.removeItem('uply_waitlist_ref');
    sessionStorage.removeItem('uply_referrer_username');
    sessionStorage.removeItem('uply_referrer_name');
  } catch {}

  console.log('Referral data cleared from all storage methods');
}
