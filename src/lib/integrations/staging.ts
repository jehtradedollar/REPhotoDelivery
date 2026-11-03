import "server-only";

// Virtual staging. Pages and actions only talk to this interface.
//   HttpStagingProvider    when VIRTUAL_STAGING_API_URL is set. A generic JSON
//                          adapter; map it to the chosen vendor's API here.
//   ManualStagingProvider  otherwise: paid requests queue on the project page
//                          and the studio uploads the staged photo itself.
//
// Generic contract the HTTP adapter speaks:
//   POST {VIRTUAL_STAGING_API_URL}
//        Authorization: Bearer {VIRTUAL_STAGING_API_KEY}
//        { image_url, room_type, style, prompt, callback_url, reference }
//   ->   { id, status: "processing" | "done" | "failed", output_url?, error? }
//   GET  {VIRTUAL_STAGING_API_URL}/{id}  -> same shape (used for polling)
//   The vendor may POST that same shape to callback_url when finished; the
//   callback must carry header X-Staging-Secret: {VIRTUAL_STAGING_WEBHOOK_SECRET}.

export interface StagingJob {
  imageUrl: string;
  roomType: string;
  style: string;
  prompt: string;
  callbackUrl: string;
  reference: string;
}

export type StagingResult = { status: "processing"; jobId: string } | { status: "done"; jobId: string; outputUrl: string } | { status: "failed"; jobId?: string; error: string };

export interface StagingProvider {
  readonly name: "http" | "manual";
  submit(job: StagingJob): Promise<StagingResult | null>;
  check(jobId: string): Promise<StagingResult>;
}

export function parseStagingResponse(json: unknown): StagingResult {
  const r = (json ?? {}) as Record<string, unknown>;
  const id = String(r.id ?? r.job_id ?? "");
  const status = String(r.status ?? "").toLowerCase();
  const out = (r.output_url ?? r.result_url ?? r.image_url) as string | undefined;
  if (["done", "completed", "succeeded", "success"].includes(status) && out) return { status: "done", jobId: id, outputUrl: out };
  if (["failed", "error", "canceled", "cancelled"].includes(status)) return { status: "failed", jobId: id, error: String(r.error ?? "The staging service couldn't process this photo.") };
  if (!id) return { status: "failed", error: "The staging service didn't return a job id." };
  return { status: "processing", jobId: id };
}

class HttpStagingProvider implements StagingProvider {
  readonly name = "http" as const;
  private base = process.env.VIRTUAL_STAGING_API_URL!.replace(/\/$/, "");
  private headers = { Authorization: `Bearer ${process.env.VIRTUAL_STAGING_API_KEY ?? ""}`, "Content-Type": "application/json", Accept: "application/json" };

  async submit(job: StagingJob) {
    const res = await fetch(this.base, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ image_url: job.imageUrl, room_type: job.roomType, style: job.style, prompt: job.prompt, callback_url: job.callbackUrl, reference: job.reference }),
    });
    if (!res.ok) return { status: "failed" as const, error: `Staging service error (${res.status})` };
    return parseStagingResponse(await res.json());
  }

  async check(jobId: string) {
    const res = await fetch(`${this.base}/${encodeURIComponent(jobId)}`, { headers: this.headers });
    if (!res.ok) return { status: "failed" as const, jobId, error: `Staging service error (${res.status})` };
    return parseStagingResponse(await res.json());
  }
}

class ManualStagingProvider implements StagingProvider {
  readonly name = "manual" as const;
  async submit() {
    return null; // stays queued for the studio
  }
  async check(jobId: string): Promise<StagingResult> {
    return { status: "processing", jobId };
  }
}

export function createStaging(): StagingProvider {
  return process.env.VIRTUAL_STAGING_API_URL ? new HttpStagingProvider() : new ManualStagingProvider();
}
