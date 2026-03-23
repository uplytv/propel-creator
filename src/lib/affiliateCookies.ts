export function setAffiliateCookie(name: string, value: string, days: number = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  // Also store in localStorage as backup — cookies can be lost during OAuth redirects
  try { localStorage.setItem(name, value); } catch {}
}

export function getAffiliateCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  if (match) return match[2];
  // Fallback to localStorage if cookie was lost (e.g. OAuth redirect)
  try { return localStorage.getItem(name); } catch { return null; }
}

export function clearAffiliateCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  try { localStorage.removeItem(name); } catch {}
}
