import { getApiKey } from "./printConfig";

export function assertApiKey(request: Request): Response | null {
  const required = getApiKey();
  if (!required) {
    return null;
  }
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== required) {
    return Response.json({ ok: false, error: "Ongeldige API-sleutel" }, { status: 401 });
  }
  return null;
}
