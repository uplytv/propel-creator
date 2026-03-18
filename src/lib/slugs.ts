/** Generate a URL-safe slug from any text */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'untitled';
}

/** Build content URLs using creator username + slug */
export function buildStreamUrl(creatorUsername: string, slug: string): string {
  return `/${encodeURIComponent(creatorUsername)}/live/${slug}`;
}

export function buildVideoUrl(creatorUsername: string, slug: string): string {
  return `/${encodeURIComponent(creatorUsername)}/videos/${slug}`;
}

export function buildClipUrl(creatorUsername: string, slug: string): string {
  return `/${encodeURIComponent(creatorUsername)}/clips/${slug}`;
}

export function buildCommunityPostUrl(creatorUsername: string, slug: string): string {
  return `/${encodeURIComponent(creatorUsername)}/community/${slug}`;
}

export function buildSpaceUrl(creatorUsername: string, slug: string): string {
  return `/${encodeURIComponent(creatorUsername)}/${slug}`;
}

/** Format relative time */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
