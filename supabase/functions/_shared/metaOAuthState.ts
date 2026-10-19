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

export async function signMetaState(payload: { n: string }, secret: string): Promise<string> {
  const encoded = encode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await signature(encoded, secret)}`;
}

export async function verifyMetaState(state: string, secret: string): Promise<{ n: string }> {
  const parts = state.split(".");
  if (parts.length !== 2 || state.length > 4096 || !secret) throw new Error("bad state");
  const [payload, supplied] = parts;
  if (!await constantTimeEqual(supplied, await signature(payload, secret))) throw new Error("bad signature");
  // Identity is never carried in state: only the stored nonce row may supply it.
  const parsed = JSON.parse(new TextDecoder().decode(decode(payload)));
  if (typeof parsed.n !== "string" || !parsed.n) throw new Error("invalid nonce");
  return { n: parsed.n };
}