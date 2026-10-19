function ipv4Private(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 169 && b === 254);
}

export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (!ip.includes(":")) return ipv4Private(ip);
  // Normalize IPv6, including IPv4-mapped addresses, before checking prefixes.
  const normalized = ip.replace(/(\d+\.\d+\.\d+\.\d+)$/, (v4) => {
    const octets = v4.split(".").map(Number);
    return ((octets[0] << 8) | octets[1]).toString(16) + ":" + ((octets[2] << 8) | octets[3]).toString(16);
  });
  const [left, right] = normalized.split("::");
  const head = left ? left.split(":") : [];
  const tail = right ? right.split(":") : [];
  const groups = (right !== undefined ? [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail] : head)
    .map((group) => parseInt(group, 16));
  if (groups.length !== 8 || groups.some((group) => !Number.isFinite(group))) return true;
  const loopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] <= 1;
  const mapped = groups.slice(0, 5).every((group) => group === 0) && (groups[5] === 0xffff || groups[5] === 0);
  return loopback || (groups[0] & 0xfe00) === 0xfc00 || (groups[0] & 0xffc0) === 0xfe80 ||
    (mapped && ipv4Private(`${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`));
}

export async function validatePublicUrl(value: string): Promise<URL> {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "internal" || hostname === "local" ||
      hostname.endsWith(".internal") || hostname.endsWith(".local")) throw new Error("URL is not public");
  const literal = hostname.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  if (literal) {
    if (isPrivateAddress(hostname)) throw new Error("Private IP addresses are not allowed");
  } else {
    const resolve = async (type: "A" | "AAAA") => {
      try { return await Deno.resolveDns(hostname, type); }
      catch (error) {
        if (error instanceof Deno.errors.NotFound) return [];
        throw error;
      }
    };
    const records = (await Promise.all([resolve("A"), resolve("AAAA")])).flat();
    if (!records.length || records.some(isPrivateAddress)) throw new Error("Hostname does not resolve to public addresses");
  }
  return url;
}

export async function fetchPublicPage(value: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  // DNS and streaming reads are included in the overall eight-second deadline.
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(new Error("URL fetch timed out")), { once: true });
  });
  const work = async () => {
    let next = value;
    for (let hop = 0; hop <= 3; hop++) {
      const url = await validatePublicUrl(next);
      controller.signal.throwIfAborted();
      const response = await fetch(url, { redirect: "manual", signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ProductImporter/1.0)" } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || hop === 3) throw new Error("Too many redirects or missing location");
        next = new URL(location, url).toString();
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Failed to fetch: ${response.status}`); }
      const reader = response.body?.getReader();
      if (!reader) return "";
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (size < 1024 * 1024) {
          const { value: chunk, done } = await reader.read();
          if (done) break;
          const limited = chunk.slice(0, 1024 * 1024 - size);
          chunks.push(limited);
          size += limited.length;
        }
      } finally { await reader.cancel(); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return new TextDecoder().decode(bytes);
    }
    throw new Error("Too many redirects");
  };
  try { return await Promise.race([work(), aborted]); }
  finally { clearTimeout(timeout); }
}