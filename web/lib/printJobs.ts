import { printLabel } from "./printService";

export type PrintJobStatus = "pending" | "done" | "error";

export interface PrintJob {
  status: PrintJobStatus;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, PrintJob>();

const MAX_AGE_MS = 15 * 60 * 1000;

function pruneOldJobs() {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) {
      jobs.delete(id);
    }
  }
}

export function startPrintJob(labelSizeId: string, imageBase64: string): string {
  pruneOldJobs();
  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: "pending", createdAt: Date.now() });

  void (async () => {
    try {
      await printLabel(labelSizeId, imageBase64);
      jobs.set(jobId, { status: "done", createdAt: Date.now() });
    } catch (err) {
      jobs.set(jobId, {
        status: "error",
        error: err instanceof Error ? err.message : "Print mislukt",
        createdAt: Date.now(),
      });
    }
  })();

  return jobId;
}

export function getPrintJob(jobId: string): PrintJob | undefined {
  return jobs.get(jobId);
}
