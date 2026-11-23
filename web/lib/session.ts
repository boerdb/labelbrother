/**
 * Eenvoudige wachtwoordlogin voor Label Printer.
 *
 * Het cookie bevat `<vervaldatum>.<handtekening>`; de handtekening is een
 * HMAC met het wachtwoord als sleutel. Wachtwoord wijzigen (BROTHER_PASSWORD)
 * maakt dus meteen alle bestaande logins ongeldig.
 */

export const SESSION_COOKIE = "brother_sessie";
export const SESSION_MAX_AGE_SEC = 365 * 24 * 60 * 60;

function password(): string | null {
  const pw = process.env.BROTHER_PASSWORD?.trim();
  return pw ? pw : null;
}

export function isAuthConfigured(): boolean {
  return password() !== null;
}

const encoder = new TextEncoder();

async function hmacHex(data: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`brother-sessie:${key}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(input: string): Promise<boolean> {
  const pw = password();
  if (!pw || !input) return false;
  // Beide kanten hashen, zodat de vergelijking niet van de lengte afhangt.
  return safeEqual(await hmacHex(input, "cmp"), await hmacHex(pw, "cmp"));
}

export async function createSessionToken(nowMs = Date.now()): Promise<string> {
  const pw = password();
  if (!pw) throw new Error("BROTHER_PASSWORD ontbreekt");
  const exp = String(Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SEC);
  return `${exp}.${await hmacHex(exp, pw)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  nowMs = Date.now()
): Promise<boolean> {
  const pw = password();
  if (!pw || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expStr = token.slice(0, dot);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) return false;
  return safeEqual(token.slice(dot + 1), await hmacHex(expStr, pw));
}
