import { assertApiKey } from "@/lib/auth";
import { getDefaultLabel } from "@/lib/printConfig";
import { getPrintJob, startPrintJob } from "@/lib/printJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PrintBody {
  labelSize?: string;
  image?: string;
  dither?: boolean;
}

export async function GET(request: Request) {
  const authError = assertApiKey(request);
  if (authError) {
    return authError;
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return Response.json({ ok: false, error: "jobId ontbreekt" }, { status: 400 });
  }

  const job = getPrintJob(jobId);
  if (!job) {
    return Response.json({ ok: false, error: "Onbekende printjob" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    jobId,
    status: job.status,
    error: job.error,
  });
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
  const jobId = startPrintJob(labelSize, body.image);

  return Response.json({ ok: true, jobId, async: true });
}
