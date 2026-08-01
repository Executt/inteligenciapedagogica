/** Helpers isomórficos (Web Crypto) usados na ingestão Pulse. */

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

/** Comparação em tempo constante para strings hexadecimais de mesmo tamanho. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return `pulse_${toHex(arr.buffer)}`;
}

export const PULSE_SETTING_KEY = "pulse.ingest";

export type PulseIngestConfig = {
  token_hash?: string | null;
  token_prefix?: string | null;
  rotated_at?: string | null;
  require_signature?: boolean;
  skew_seconds?: number;
  allow_env_token?: boolean;
};

export const PULSE_DEFAULTS: Required<Pick<PulseIngestConfig, "require_signature" | "skew_seconds" | "allow_env_token">> = {
  require_signature: false,
  skew_seconds: 300,
  allow_env_token: true,
};
