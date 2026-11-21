import { getApiKey } from "./printConfig";
import { SESSION_COOKIE, safeEqual, verifySessionToken } from "./session";

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

/**
 * Toegang tot de print-API: met een geldige login (de eigen app) of met de
 * API-sleutel (andere apps, zoals adressen). Zonder API_KEY is alleen de
 * login nodig, die de middleware al afdwingt.
 */
export async function assertApiKey(request: Request): Promise<Response | null> {
  const required = getApiKey();
  if (!required) {
    return null;
  }
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided && safeEqual(provided, required)) {
    return null;
  }
  if (await verifySessionToken(cookieValue(request, SESSION_COOKIE))) {
    return null;
  }
  return Response.json({ ok: false, error: "Ongeldige API-sleutel" }, { status: 401 });
}
