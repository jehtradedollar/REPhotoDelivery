import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getMediaItem, getProject, logActivity, newId } from "./data";
import { imageDerivatives } from "./image-server";
import { mailer, staging, storage } from "./integrations";
import { mediaKey } from "./integrations/storage";
import { getSetting, setSetting } from "./settings";
import type { StagingRequest } from "./types";
import { appUrl } from "./url";

export { ROOM_TYPES, STYLES } from "./staging-options";

export interface StagingConfig {
  enabled: boolean;
  /** Price per photo, in cents. */
  price: number;
}
const DEFAULT_CONFIG: StagingConfig = { enabled: true, price: 2900 };

export async function getStagingConfig(): Promise<StagingConfig> {
  return { ...DEFAULT_CONFIG, ...((await getSetting<Partial<StagingConfig>>("staging")) ?? {}) };
}
export const saveStagingConfig = (c: StagingConfig) => setSetting("staging", c);

export async function stagingRequestsFor(projectId: string) {
  return db.select().from(s.stagingRequests).where(eq(s.stagingRequests.projectId, projectId)).orderBy(s.stagingRequests.createdAt);
}

/** Called once a staging invoice is paid: queue its requests and send them to the provider. */
export async function startStagingForInvoice(invoiceId: string) {
  const reqs = await db
    .update(s.stagingRequests)
    .set({ status: "queued" })
    .where(and(eq(s.stagingRequests.invoiceId, invoiceId), eq(s.stagingRequests.status, "awaiting_payment")))
    .returning();
  if (!reqs.length) return;
  for (const r of reqs) await submitStaging(r);
  if (staging.name === "manual") {
    const project = await getProject(reqs[0].projectId);
    const owners = await db.select({ email: s.users.email }).from(s.users).where(eq(s.users.role, "owner"));
    await Promise.all(
      owners.map((o) =>
        mailer.send({
          to: o.email,
          subject: `Virtual staging ordered: ${project?.address}`,
          lines: [`${reqs.length} photo${reqs.length > 1 ? "s were" : " was"} paid for virtual staging at ${project?.address}.`, "No staging API is connected, so upload the staged photos from the project page."],
          action: { label: "Open project", url: appUrl(`/studio/projects/${reqs[0].projectId}`) },
        }),
      ),
    );
  }
}

async function submitStaging(r: StagingRequest) {
  if (staging.name === "manual") return;
  const src = await getMediaItem(r.mediaId);
  const key = src?.webKey ?? src?.storageKey;
  if (!src || !key) return fail(r.id, "The original photo is missing.");
  const url = await storage.getDownloadUrl(key, { expiresInSec: 6 * 3600 });
  const result = await staging.submit({
    imageUrl: url.startsWith("http") ? url : appUrl(url),
    roomType: r.roomType,
    style: r.style,
    prompt: r.prompt,
    callbackUrl: appUrl("/api/webhooks/staging"),
    reference: r.id,
  });
  await applyResult(r, result);
}

async function fail(id: string, error: string) {
  await db.update(s.stagingRequests).set({ status: "failed", error }).where(eq(s.stagingRequests.id, id));
}

/** Apply a provider response (from submit, polling or the webhook). */
export async function applyResult(r: StagingRequest, result: Awaited<ReturnType<typeof staging.check>> | null) {
  if (!result) return;
  if (result.status === "failed") return fail(r.id, result.error);
  if (result.status === "processing") {
    await db.update(s.stagingRequests).set({ status: "processing", providerJobId: result.jobId }).where(eq(s.stagingRequests.id, r.id));
    return;
  }
  const res = await fetch(result.outputUrl);
  if (!res.ok) return fail(r.id, `Couldn't download the staged image (${res.status}).`);
  await ingestStaged(r, Buffer.from(await res.arrayBuffer()));
}

/** Store a finished staged image as a new photo in the project's gallery. */
export async function ingestStaged(r: StagingRequest, image: Buffer) {
  const src = await getMediaItem(r.mediaId);
  if (!src) return fail(r.id, "The original photo is missing.");
  let d: Awaited<ReturnType<typeof imageDerivatives>>;
  try {
    d = await imageDerivatives(image);
  } catch {
    return fail(r.id, "The staged file isn't a readable image.");
  }
  const id = newId("med");
  const base = src.filename.replace(/\.[^.]+$/, "");
  const name = `${base}-staged.jpg`;
  const keys = { original: mediaKey(r.projectId, id, `original-${name}`), thumb: mediaKey(r.projectId, id, "thumb.jpg"), web: mediaKey(r.projectId, id, "web.jpg") };
  await Promise.all([
    storage.putObject(keys.original, d.original, "image/jpeg"),
    storage.putObject(keys.thumb, d.thumb, "image/jpeg"),
    storage.putObject(keys.web, d.web, "image/jpeg"),
  ]);
  const sort = (await db.select({ n: sql<number>`coalesce(max(sort), 0)::int` }).from(s.media).where(eq(s.media.projectId, r.projectId)))[0].n + 1;
  await db.insert(s.media).values({
    id,
    projectId: r.projectId,
    kind: "photo",
    filename: name,
    contentType: "image/jpeg",
    storageKey: keys.original,
    thumbKey: keys.thumb,
    // Staging is paid for separately, so its preview is the clean image.
    previewKey: keys.web,
    webKey: keys.web,
    sizeBytes: d.original.length,
    width: d.width,
    height: d.height,
    stagedFromId: src.id,
    seed: src.seed,
    sort,
  });
  await db.update(s.stagingRequests).set({ status: "done", resultMediaId: id, completedAt: new Date().toISOString(), error: null }).where(eq(s.stagingRequests.id, r.id));
  const project = await getProject(r.projectId);
  await logActivity("delivery", `Virtual staging finished for ${src.filename}${project ? ` at ${project.address}` : ""}`, { projectId: r.projectId, clientId: project?.clientId });
}

/** Poll the provider for jobs still running. Safe to call often. */
export async function pollStaging(projectId?: string) {
  if (staging.name === "manual") return 0;
  const running = await db
    .select()
    .from(s.stagingRequests)
    .where(and(inArray(s.stagingRequests.status, ["processing", "queued"]), projectId ? eq(s.stagingRequests.projectId, projectId) : undefined));
  for (const r of running) {
    if (r.status === "queued" || !r.providerJobId) await submitStaging(r);
    else await applyResult(r, await staging.check(r.providerJobId));
  }
  return running.length;
}

/** What the delivery page needs to offer staging, or null when it shouldn't. */
export async function stagingOffer(projectId: string, unlocked: boolean, photos: { id: string; kind: string; group?: string; thumbUrl: string | null; filename: string }[]) {
  const config = await getStagingConfig();
  let requests = await stagingRequestsFor(projectId);
  if (staging.name === "http" && requests.some((r) => r.status === "processing" || r.status === "queued")) {
    await pollStaging(projectId).catch(() => {});
    requests = await stagingRequestsFor(projectId);
  }
  const eligible = photos.filter((p) => p.kind === "photo" && !p.group).map((p) => ({ id: p.id, thumbUrl: p.thumbUrl, filename: p.filename }));
  const visible = requests.filter((r) => r.status !== "awaiting_payment" && r.status !== "cancelled");
  const offered = config.enabled && eligible.length > 0;
  if (!offered && !visible.length) return null;
  // The offer shows on locked galleries too, so agents see it before paying; ordering waits for payment.
  return { price: config.price, offered, canOrder: offered && unlocked, photos: eligible, requests: visible };
}
