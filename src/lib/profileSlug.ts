export function normalizeProfileSlugInput(value?: string | null) {
  const raw = value || "";
  let decoded = raw;

  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  return decoded.replace(/^@+/, "").trim();
}

export function getProfileHandleCandidates(value?: string | null) {
  const normalized = normalizeProfileSlugInput(value);
  const compact = normalized.replace(/[\s.-]+/g, "");
  const alphanumeric = normalized.replace(/[^a-zA-Z0-9_]/g, "");
  const dashed = normalized
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return Array.from(new Set([normalized, compact, alphanumeric, dashed].filter(Boolean)));
}