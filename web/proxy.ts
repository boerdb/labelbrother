import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiKey } from "@/lib/printConfig";
import { SESSION_COOKIE, safeEqual, verifySessionToken } from "@/lib/session";

/**
 * Alles achter de login, behalve de loginpagina zelf.
 * Scripts mogen ook binnen met de API-sleutel (x-api-key), als die is ingesteld.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const apiKey = getApiKey();
  const provided = request.headers.get("x-api-key");
  if (apiKey && provided && safeEqual(provided, apiKey)) {
    return NextResponse.next();
  }

  if (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Inloggen vereist" }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/|sw\\.js|swe-worker|manifest\\.webmanifest|favicon|icons/|.*\\.(?:png|svg|ico|webp|jpg|woff2?)$).*)",
  ],
};
