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
 * API-sleutel (andere apps, zoals adressen). /api/print valt buiten de
 * middleware, dus deze controle is daar de enige: altijd login of sleutel.
 */
export async function assertApiKey(request: Request): Promise<Response | null> {
  if (await verifySessionToken(cookieValue(request, SESSION_COOKIE))) {
    return null;
  }
  const required = getApiKey();
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (required && provided && safeEqual(provided, required)) {
    return null;
  }
  return Response.json({ ok: false, error: "Inloggen vereist" }, { status: 401 });
}
