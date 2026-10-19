import { constantTimeEqual } from "./constantTime.ts";

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("bad state encoding");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encode(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

export async function signMetaState(payload: { uid: string; n: string; t: number }, secret: string): Promise<string> {
  const encoded = encode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await signature(encoded, secret)}`;
}

export async function verifyMetaState(state: string, secret: string): Promise<{ uid: string; n: string; t: number }> {
  const parts = state.split(".");
  if (parts.length !== 2 || state.length > 4096 || !secret) throw new Error("bad state");
  const [payload, supplied] = parts;
  if (!await constantTimeEqual(supplied, await signature(payload, secret))) throw new Error("bad signature");
  // Do not parse the user identity until the signature has been verified.
  const parsed = JSON.parse(new TextDecoder().decode(decode(payload)));
  if (typeof parsed.uid !== "string" || !parsed.uid || typeof parsed.n !== "string" ||
      typeof parsed.t !== "number" || !Number.isFinite(parsed.t) || parsed.t > Date.now() ||
      Date.now() - parsed.t > 15 * 60 * 1000) throw new Error("state expired or invalid");
  return parsed;
}