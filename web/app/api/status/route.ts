import { assertApiKey } from "@/lib/auth";
import { probePrinter } from "@/lib/printService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = assertApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const probe = await probePrinter();
    if (!probe.reachable) {
      return Response.json({ ok: false, error: probe.message, ...probe }, { status: 502 });
    }
    return Response.json({ ok: true, ...probe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status ophalen mislukt";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
