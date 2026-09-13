import { assertApiKey } from "@/lib/auth";
import { getDefaultLabel } from "@/lib/printConfig";
import { printLabel } from "@/lib/printService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PrintBody {
  labelSize?: string;
  image?: string;
  dither?: boolean;
}

export async function POST(request: Request) {
  const authError = assertApiKey(request);
  if (authError) {
    return authError;
  }

  let body: PrintBody;
  try {
    body = (await request.json()) as PrintBody;
  } catch {
    return Response.json({ ok: false, error: "Ongeldige JSON" }, { status: 400 });
  }

  if (!body.image) {
    return Response.json({ ok: false, error: "Geen afbeelding meegestuurd" }, { status: 400 });
  }

  const labelSize = body.labelSize ?? getDefaultLabel();
  const jobId = crypto.randomUUID();

  try {
    await printLabel(labelSize, body.image);
    return Response.json({ ok: true, jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Print mislukt";
    return Response.json({ ok: false, error: message, jobId }, { status: 502 });
  }
}
