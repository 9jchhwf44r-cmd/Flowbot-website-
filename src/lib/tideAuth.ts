export const TIDE_SESSION_COOKIE = "tide_session";

async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Het session-token is afgeleid van TIDE_PASSWORD, zodat het wachtwoord zelf
 * nooit in de cookie hoeft te staan. Zonder TIDE_PASSWORD is Tide onbereikbaar. */
async function expectedSessionToken(): Promise<string | null> {
  const password = process.env.TIDE_PASSWORD;
  if (!password) return null;
  return hmacHex("tide-session-v1", password);
}

export async function isValidSession(cookieValue: string | undefined | null): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await expectedSessionToken();
  if (!expected) return false;
  return timingSafeEqual(cookieValue, expected);
}

/** Geeft het session-token terug bij een correct wachtwoord, anders null. */
export async function verifyPassword(password: string): Promise<string | null> {
  const actual = process.env.TIDE_PASSWORD;
  if (!actual) return null;
  if (!timingSafeEqual(password, actual)) return null;
  return expectedSessionToken();
}

export function isTidePasswordConfigured(): boolean {
  return Boolean(process.env.TIDE_PASSWORD);
}
