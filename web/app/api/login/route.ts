import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  checkPassword,
  createSessionToken,
  isAuthConfigured,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Eenvoudige rem op raden: per IP max. 10 pogingen per 15 minuten. */
const attempts = new Map<string, { count: number; since: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "onbekend"
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Inloggen is niet ingesteld (BROTHER_PASSWORD ontbreekt)" },
      { status: 503 }
    );
  }

  const ip = clientIp(req);
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && now - entry.since < WINDOW_MS && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Te veel pogingen. Probeer het over een kwartier opnieuw." },
      { status: 429 }
    );
  }

  let wachtwoord = "";
  try {
    const body = (await req.json()) as { wachtwoord?: unknown };
    if (typeof body.wachtwoord === "string") wachtwoord = body.wachtwoord;
  } catch {
    /* lege body */
  }

  if (!(await checkPassword(wachtwoord))) {
    if (!entry || now - entry.since >= WINDOW_MS) {
      attempts.set(ip, { count: 1, since: now });
    } else {
      entry.count++;
    }
    return NextResponse.json({ error: "Wachtwoord klopt niet" }, { status: 401 });
  }

  attempts.delete(ip);
  const secure =
    req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
    sameSite: "lax",
    secure,
    httpOnly: true,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
