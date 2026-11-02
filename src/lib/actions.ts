"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import {
  clearLoginFailures,
  createAuthToken,
  endSession,
  findUserByEmail,
  findValidToken,
  getSession,
  hashPassword,
  loginBlocked,
  markTokenUsed,
  MIN_PASSWORD,
  ownerExists,
  recordLoginFailure,
  requireClient,
  requireOwner,
  startSession,
  verifyPassword,
} from "./auth";
import { markInvoicePaid } from "./billing";
import { brand } from "./brand";
import { viewerFor } from "./access";
import { allInvoiceNumbers, getClient, getInvoice, getMediaItem, getProject, getShoot, logActivity, newId } from "./data";
import { fullAddress } from "./format";
import { calendar, payments, storage } from "./integrations";
import { mediaKey } from "./integrations/storage";
import { newToken } from "./ids";
import { invoiceTotal, nextInvoiceNumber } from "./invoice";
import { mockCheckoutAllowed } from "./integrations/payments";
import { getStockPacks, packsFor } from "./stock";
import {
  notifyBookingRequested,
  notifyDelivered,
  notifyInvoiceSent,
  notifyShootChanged,
  notifyShootConfirmed,
  sendInvite,
  sendPasswordReset,
} from "./notify";
import { DEFAULT_TEMPLATES, saveTemplates } from "./templates";
import { appUrl } from "./url";
import type { MediaKind, Project, ProjectStatus, Shoot } from "./types";

/* ---------- helpers ---------- */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const raw = str(fd, k);
  if (!raw) return null;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? v : null;
};
const cents = (fd: FormData, k: string) => Math.round((Number(str(fd, k).replace(/[$,]/g, "")) || 0) * 100);
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const safeNext = (next: string, prefix: string) => (next.startsWith(prefix) && !next.startsWith("//") ? next : prefix);
const back = (path: string, params: Record<string, string>) => `${path}?${new URLSearchParams(params)}`;
const refresh = () => revalidatePath("/", "layout");

/* ================= Auth ================= */

export async function signIn(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = str(fd, "next");
  if (loginBlocked(email)) redirect(back("/login", { error: "locked", next }));
  const user = email ? await findUserByEmail(email) : undefined;
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    recordLoginFailure(email);
    redirect(back("/login", { error: "invalid", next }));
  }
  if (user.role === "client") {
    const client = await getClient(user.clientId);
    if (!client || client.archived) redirect(back("/login", { error: "inactive" }));
  }
  clearLoginFailures(email);
  await startSession(user);
  redirect(user.role === "owner" ? safeNext(next, "/studio") : safeNext(next, "/portal"));
}

/** One-click sign-in for seeded demo accounts. Only when DEMO_MODE=true. */
export async function signInDemo(fd: FormData) {
  if (process.env.DEMO_MODE !== "true") redirect("/login");
  const as = str(fd, "as");
  const user = (await db.select().from(s.users).where(as === "owner" ? eq(s.users.role, "owner") : eq(s.users.email, "maya@summitrealty.com")).limit(1))[0];
  if (!user) redirect(back("/login", { error: "noseed" }));
  await startSession(user);
  redirect(user.role === "owner" ? "/studio" : "/portal");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

/** First-run: create the studio owner account. Disabled once an owner exists. */
export async function setupOwner(fd: FormData) {
  if (await ownerExists()) redirect("/login");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name || !validEmail(email)) redirect(back("/setup", { error: "missing" }));
  if (password.length < MIN_PASSWORD) redirect(back("/setup", { error: "short" }));
  const user = { id: newId("usr"), name, email, role: "owner" as const, passwordHash: await hashPassword(password), sessionVersion: 1 };
  await db.insert(s.users).values(user);
  await startSession(user);
  redirect("/studio");
}

export async function requestPasswordReset(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const user = email ? await findUserByEmail(email) : undefined;
  if (user) await sendPasswordReset(user, await createAuthToken(user.id, user.passwordHash ? "reset" : "invite"));
  // Same answer either way so this can't be used to discover accounts.
  redirect("/forgot?sent=1");
}

async function setPasswordWithToken(fd: FormData, kind: "invite" | "reset") {
  const token = str(fd, "token");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const base = kind === "invite" ? `/invite/${token}` : `/reset/${token}`;
  if (password.length < MIN_PASSWORD) redirect(back(base, { error: "short" }));
  if (password !== confirm) redirect(back(base, { error: "mismatch" }));
  const found = await findValidToken(token, kind);
  if (!found) redirect(back(base, { error: "expired" }));
  const [user] = await db
    .update(s.users)
    .set({ passwordHash: await hashPassword(password), sessionVersion: sql`${s.users.sessionVersion} + 1` })
    .where(eq(s.users.id, found.user.id))
    .returning();
  await markTokenUsed(found.token.id);
  await startSession(user);
  redirect(user.role === "owner" ? "/studio" : "/portal");
}

export async function acceptInvite(fd: FormData) {
  return setPasswordWithToken(fd, "invite");
}

export async function resetPassword(fd: FormData) {
  return setPasswordWithToken(fd, "reset");
}

export async function changePassword(fd: FormData) {
  const sess = await getSession();
  if (!sess) redirect("/login");
  const area = sess.role === "owner" ? "/studio/settings" : "/portal/account";
  const user = (await db.select().from(s.users).where(eq(s.users.id, sess.userId)))[0];
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  if (!user.passwordHash || !(await verifyPassword(current, user.passwordHash))) redirect(back(area, { pw: "wrong" }));
  if (next.length < MIN_PASSWORD) redirect(back(area, { pw: "short" }));
  const [updated] = await db
    .update(s.users)
    .set({ passwordHash: await hashPassword(next), sessionVersion: sql`${s.users.sessionVersion} + 1` })
    .where(eq(s.users.id, user.id))
    .returning();
  await startSession(updated); // keep this device signed in, sign out the rest
  redirect(back(area, { pw: "ok" }));
}

/** Agents edit their own contact details. */
export async function updateMyProfile(fd: FormData) {
  const sess = await requireClient();
  const name = str(fd, "name");
  if (!name) redirect(back("/portal/account", { error: "missing" }));
  await db.update(s.clients).set({ name, phone: str(fd, "phone"), brokerage: str(fd, "brokerage") }).where(eq(s.clients.id, sess.clientId));
  await db.update(s.users).set({ name }).where(eq(s.users.id, sess.userId));
  refresh();
  redirect(back("/portal/account", { saved: "1" }));
}

/* ================= Owner: clients ================= */

async function inviteClient(clientId: string) {
  const client = (await getClient(clientId))!;
  let user = (await db.select().from(s.users).where(eq(s.users.clientId, clientId)))[0];
  if (!user) {
    [user] = await db.insert(s.users).values({ id: newId("usr"), email: client.email.toLowerCase(), name: client.name, role: "client", clientId }).returning();
  }
  const token = await createAuthToken(user.id, "invite");
  await sendInvite(client, token);
  return token;
}

export async function createClient(fd: FormData) {
  await requireOwner();
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  if (!name || !validEmail(email)) redirect(back("/studio/clients/new", { error: "missing" }));
  if (await findUserByEmail(email)) redirect(back("/studio/clients/new", { error: "taken" }));
  const id = newId("cli");
  await db.insert(s.clients).values({
    id,
    name,
    email,
    phone: str(fd, "phone"),
    brokerage: str(fd, "brokerage"),
    notes: str(fd, "notes") || null,
    hue: Math.floor(Math.random() * 360),
  });
  await db.insert(s.users).values({ id: newId("usr"), email, name, role: "client", clientId: id });
  if (fd.get("invite")) await inviteClient(id);
  await logActivity("client", `${name} was added as a client`, { clientId: id });
  refresh();
  redirect(back(`/studio/clients/${id}`, { created: fd.get("invite") ? "invited" : "1" }));
}

export async function updateClient(clientId: string, fd: FormData) {
  await requireOwner();
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const path = `/studio/clients/${clientId}/edit`;
  if (!name || !validEmail(email)) redirect(back(path, { error: "missing" }));
  const existing = await findUserByEmail(email);
  if (existing && existing.clientId !== clientId) redirect(back(path, { error: "taken" }));
  await db.update(s.clients).set({ name, email, phone: str(fd, "phone"), brokerage: str(fd, "brokerage"), notes: str(fd, "notes") || null }).where(eq(s.clients.id, clientId));
  await db.update(s.users).set({ name, email }).where(eq(s.users.clientId, clientId));
  refresh();
  redirect(back(`/studio/clients/${clientId}`, { saved: "1" }));
}

export async function setClientArchived(clientId: string, archived: boolean) {
  await requireOwner();
  await db.update(s.clients).set({ archived }).where(eq(s.clients.id, clientId));
  refresh();
  redirect(archived ? "/studio/clients" : `/studio/clients/${clientId}`);
}

export async function resendInvite(clientId: string) {
  await requireOwner();
  const token = await inviteClient(clientId);
  redirect(back(`/studio/clients/${clientId}`, { inviteLink: appUrl(`/invite/${token}`) }));
}

/* ================= Projects and shoots ================= */

async function catalogDuration(serviceIds: string[]) {
  if (!serviceIds.length) return 60;
  const rows = await db.select({ d: s.services.durationMin }).from(s.services).where(inArray(s.services.id, serviceIds));
  return Math.max(60, rows.reduce((t, r) => t + r.d, 0));
}

async function servicesFromForm(fd: FormData) {
  const pkg = (await db.select().from(s.packages).where(eq(s.packages.id, str(fd, "package"))))[0];
  const extra = fd.getAll("services").map(String);
  return { packageId: pkg?.id ?? null, serviceIds: Array.from(new Set([...(pkg?.serviceIds ?? []), ...extra])) };
}

function startFromForm(fd: FormData) {
  const date = str(fd, "date");
  const time = str(fd, "time") || "10:00";
  // The form posts the slot as an ISO string with the viewer's offset, so time zones are unambiguous.
  const iso = str(fd, "startIso");
  const d = iso ? new Date(iso) : new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function propertyFromForm(fd: FormData) {
  const sqft = num(fd, "sqft");
  return {
    address: str(fd, "address"),
    city: str(fd, "city"),
    state: str(fd, "state").toUpperCase() || "CA",
    zip: str(fd, "zip"),
    beds: num(fd, "beds"),
    baths: num(fd, "baths"),
    sqft: sqft === null ? null : Math.round(sqft),
    acreage: num(fd, "acreage"),
    features: parseFeatures(str(fd, "features")),
  };
}

/** "Pool, 3-car garage\nSolar" -> ["Pool", "3-car garage", "Solar"] */
function parseFeatures(raw: string) {
  return Array.from(new Set(raw.split(/[\n,;]+/).map((f) => f.trim()).filter(Boolean))).slice(0, 40);
}

/** Stock packs ticked in the booking pop-up, kept only if they really serve this address. */
async function stockFromForm(fd: FormData, property: { zip: string; city: string }) {
  const wanted = new Set(fd.getAll("stockPacks").map(String));
  if (!wanted.size) return [];
  return (await packsFor(property.zip, property.city)).map((o) => o.pack.id).filter((id) => wanted.has(id));
}

export interface StockOffer {
  id: string;
  name: string;
  description: string;
  price: number;
  zone: string;
  count: number;
  thumbs: string[];
}

/** Local-area stock packs offered for an address, for the booking pop-up. */
export async function stockOffers(zip: string, city: string): Promise<StockOffer[]> {
  const sess = await getSession();
  if (!sess) return [];
  const offers = await packsFor(String(zip ?? ""), String(city ?? ""));
  return Promise.all(
    offers.map(async (o) => ({
      id: o.pack.id,
      name: o.pack.name,
      description: o.pack.description,
      price: o.pack.price,
      zone: o.zone.name,
      count: o.items.length,
      thumbs: await Promise.all(o.items.filter((i) => i.thumbKey).slice(0, 4).map((i) => storage.getPreviewUrl(i.thumbKey!))),
    })),
  );
}

async function siteSlugFor(address: string) {
  const base = address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "listing";
  return `${base}-${newId("x", 4).slice(2)}`;
}

async function createProjectWithShoot(input: {
  clientId: string;
  property: ReturnType<typeof propertyFromForm>;
  serviceIds: string[];
  packageId: string | null;
  start: Date;
  notes: string | null;
  confirmed: boolean;
  stockPackIds: string[];
}) {
  const projectId = newId("prj");
  const shootId = newId("sht");
  const end = new Date(input.start.getTime() + (await catalogDuration(input.serviceIds)) * 60_000);
  const project: Project = {
    id: projectId,
    clientId: input.clientId,
    ...input.property,
    siteSlug: await siteSlugFor(input.property.address),
    siteTemplate: "classic",
    siteHeadline: null,
    mlsDescription: null,
    sitePublished: true,
    deliveryToken: newToken(),
    status: "scheduled",
    shootId,
    invoiceId: null,
    serviceIds: input.serviceIds,
    packageId: input.packageId,
    stockPackIds: input.stockPackIds,
    coverMediaId: null,
    coverSeed: Math.floor(Math.random() * 1000),
    deliveredAt: null,
    createdAt: new Date().toISOString(),
  };
  const shoot: Shoot = {
    id: shootId,
    projectId,
    clientId: input.clientId,
    start: input.start.toISOString(),
    end: end.toISOString(),
    status: input.confirmed ? "confirmed" : "requested",
    photographer: brand.photographer,
    accessNotes: input.notes,
    calendarEventId: null,
  };
  if (input.confirmed) shoot.calendarEventId = await calendar.createEvent(eventFor(project, shoot, await getClient(input.clientId)));
  await db.transaction(async (tx) => {
    await tx.insert(s.projects).values(project);
    await tx.insert(s.shoots).values(shoot);
  });
  return { project, shoot };
}

function eventFor(project: Project, shoot: Shoot, client?: { name: string; phone: string; email: string }) {
  return {
    title: `Shoot: ${project.address}`,
    location: fullAddress(project),
    start: shoot.start,
    end: shoot.end,
    description: [client && `${client.name} · ${client.phone || client.email}`, shoot.accessNotes, appUrl(`/studio/projects/${project.id}`)].filter(Boolean).join("\n"),
  };
}

export async function createProject(fd: FormData) {
  await requireOwner();
  const clientId = str(fd, "clientId");
  const property = propertyFromForm(fd);
  const start = startFromForm(fd);
  if (!clientId || !property.address || !start) redirect(back("/studio/projects/new", { error: "missing" }));
  if (!property.sqft) redirect(back("/studio/projects/new", { error: "sqft" }));
  const { project, shoot } = await createProjectWithShoot({ clientId, property, ...(await servicesFromForm(fd)), start, notes: str(fd, "notes") || null, confirmed: true, stockPackIds: await stockFromForm(fd, property) });
  const client = (await getClient(clientId))!;
  await logActivity("booking", `Scheduled a shoot at ${project.address}`, { projectId: project.id, clientId });
  if (fd.get("notify")) await notifyShootConfirmed(client, project, shoot);
  refresh();
  redirect(`/studio/projects/${project.id}`);
}

export async function bookShoot(fd: FormData) {
  const sess = await requireClient();
  const property = propertyFromForm(fd);
  const start = startFromForm(fd);
  if (!property.address || !start || start < new Date()) redirect(back("/portal/book", { error: "missing" }));
  if (!property.sqft) redirect(back("/portal/book", { error: "sqft" }));
  const { project, shoot } = await createProjectWithShoot({ clientId: sess.clientId, property, ...(await servicesFromForm(fd)), start, notes: str(fd, "notes") || null, confirmed: false, stockPackIds: await stockFromForm(fd, property) });
  await logActivity("booking", `${sess.name} requested a shoot at ${project.address}`, { projectId: project.id, clientId: sess.clientId });
  await notifyBookingRequested((await getClient(sess.clientId))!, project, shoot);
  refresh();
  redirect(back(`/portal/properties/${project.id}`, { booked: "1" }));
}

export async function updateProject(projectId: string, fd: FormData) {
  await requireOwner();
  const property = propertyFromForm(fd);
  if (!property.address) redirect(back(`/studio/projects/${projectId}/edit`, { error: "missing" }));
  await db
    .update(s.projects)
    .set({ ...property, serviceIds: fd.getAll("services").map(String) })
    .where(eq(s.projects.id, projectId));
  refresh();
  redirect(`/studio/projects/${projectId}`);
}

export async function setProjectStatus(projectId: string, status: ProjectStatus) {
  await requireOwner();
  await db.update(s.projects).set({ status }).where(eq(s.projects.id, projectId));
  refresh();
}

export async function confirmShoot(shootId: string) {
  await requireOwner();
  const shoot = await getShoot(shootId);
  const project = await getProject(shoot?.projectId);
  if (!shoot || !project) return;
  const client = (await getClient(shoot.clientId))!;
  const confirmed = { ...shoot, status: "confirmed" as const };
  confirmed.calendarEventId = shoot.calendarEventId ?? (await calendar.createEvent(eventFor(project, confirmed, client)));
  await db.update(s.shoots).set({ status: "confirmed", calendarEventId: confirmed.calendarEventId }).where(eq(s.shoots.id, shootId));
  await notifyShootConfirmed(client, project, confirmed);
  refresh();
}

export async function completeShoot(shootId: string) {
  await requireOwner();
  const shoot = await getShoot(shootId);
  if (!shoot) return;
  await db.update(s.shoots).set({ status: "completed" }).where(eq(s.shoots.id, shootId));
  await db.update(s.projects).set({ status: "editing" }).where(and(eq(s.projects.id, shoot.projectId), eq(s.projects.status, "scheduled")));
  refresh();
}

export async function rescheduleShoot(shootId: string, fd: FormData) {
  await requireOwner();
  const shoot = await getShoot(shootId);
  const project = await getProject(shoot?.projectId);
  const start = startFromForm(fd);
  if (!shoot || !project) return;
  if (!start) redirect(back(`/studio/projects/${project.id}`, { error: "time" }));
  const length = new Date(shoot.end).getTime() - new Date(shoot.start).getTime();
  const updated = { ...shoot, start: start.toISOString(), end: new Date(start.getTime() + length).toISOString() };
  await db.update(s.shoots).set({ start: updated.start, end: updated.end }).where(eq(s.shoots.id, shootId));
  if (shoot.calendarEventId) await calendar.updateEvent(shoot.calendarEventId, { start: updated.start, end: updated.end });
  if (fd.get("notify")) await notifyShootChanged((await getClient(shoot.clientId))!, project, updated, "rescheduled");
  refresh();
  redirect(back(`/studio/projects/${project.id}`, { rescheduled: "1" }));
}

export async function cancelShoot(shootId: string) {
  const sess = await getSession();
  const shoot = await getShoot(shootId);
  const project = await getProject(shoot?.projectId);
  if (!sess || !shoot || !project) return;
  // Agents can withdraw their own unconfirmed requests; the owner can cancel anything.
  if (sess.role === "client" && (shoot.clientId !== sess.clientId || shoot.status !== "requested")) return;
  await db.update(s.shoots).set({ status: "cancelled", calendarEventId: null }).where(eq(s.shoots.id, shootId));
  await db.update(s.projects).set({ status: "archived" }).where(eq(s.projects.id, project.id));
  if (shoot.calendarEventId) await calendar.deleteEvent(shoot.calendarEventId);
  if (sess.role === "owner") await notifyShootChanged((await getClient(shoot.clientId))!, project, shoot, "cancelled");
  await logActivity("booking", `Shoot at ${project.address} was cancelled`, { projectId: project.id, clientId: shoot.clientId });
  refresh();
}

/* ================= Media ================= */

export interface UploadRequest {
  name: string;
  type: string;
  size: number;
  /** The browser made a thumbnail, watermarked preview and web-size copy. */
  derivatives: boolean;
}

export interface UploadPlan {
  mediaId: string;
  original: { key: string; url: string; headers: Record<string, string> };
  thumb?: { key: string; url: string; headers: Record<string, string> };
  preview?: { key: string; url: string; headers: Record<string, string> };
  web?: { key: string; url: string; headers: Record<string, string> };
}

/** Step 1 of an upload: presigned URLs for each file (and its generated sizes). */
export async function prepareUploads(projectId: string, files: UploadRequest[]): Promise<UploadPlan[]> {
  await requireOwner();
  if (!(await getProject(projectId))) throw new Error("Project not found");
  return Promise.all(
    files.slice(0, 200).map(async (f) => {
      const mediaId = newId("med");
      const target = async (name: string, type: string) => {
        const key = mediaKey(projectId, mediaId, name);
        const t = await storage.createUploadTarget(key, type);
        return { key, url: t.url, headers: t.headers };
      };
      return {
        mediaId,
        original: await target(`original-${f.name}`, f.type || "application/octet-stream"),
        ...(f.derivatives && {
          thumb: await target("thumb.jpg", "image/jpeg"),
          preview: await target("preview.jpg", "image/jpeg"),
          web: await target("web.jpg", "image/jpeg"),
        }),
      };
    }),
  );
}

export interface UploadedFile {
  mediaId: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  durationSec?: number;
  keys: { original: string; thumb?: string; preview?: string; web?: string };
}

/** Step 2: record files the browser finished uploading. */
export async function completeUploads(projectId: string, files: UploadedFile[]) {
  await requireOwner();
  const project = await getProject(projectId);
  if (!project || !files.length) return;
  const prefix = `projects/${projectId}/`;
  const ok = (k?: string) => !k || k.startsWith(prefix);
  const existing = (await db.select({ n: sql<number>`count(*)::int` }).from(s.media).where(eq(s.media.projectId, projectId)))[0].n;
  const rows = files
    .filter((f) => ok(f.keys.original) && ok(f.keys.thumb) && ok(f.keys.preview) && ok(f.keys.web) && f.keys.original.startsWith(`${prefix}${f.mediaId}/`))
    .map((f, i) => {
      const kind: MediaKind = f.type.startsWith("video/") ? "video" : f.type === "application/pdf" ? "floorplan" : "photo";
      return {
        id: f.mediaId,
        projectId,
        kind,
        filename: f.name,
        contentType: f.type || "application/octet-stream",
        storageKey: f.keys.original,
        thumbKey: f.keys.thumb ?? null,
        previewKey: f.keys.preview ?? null,
        webKey: f.keys.web ?? null,
        sizeBytes: Math.round(f.size),
        width: f.width ? Math.round(f.width) : null,
        height: f.height ? Math.round(f.height) : null,
        durationSec: f.durationSec ? Math.round(f.durationSec) : null,
        seed: Math.floor(Math.random() * 5000),
        sort: existing + i,
      };
    });
  if (!rows.length) return;
  await db.insert(s.media).values(rows).onConflictDoNothing();
  if (project.status === "scheduled") await db.update(s.projects).set({ status: "editing" }).where(eq(s.projects.id, projectId));
  if (!project.coverMediaId) {
    const cover = rows.find((r) => r.thumbKey);
    if (cover) await db.update(s.projects).set({ coverMediaId: cover.id }).where(eq(s.projects.id, projectId));
  }
  await logActivity("upload", `Uploaded ${rows.length} file${rows.length > 1 ? "s" : ""} to ${project.address}`, { projectId, clientId: project.clientId });
  revalidatePath(`/studio/projects/${projectId}`);
}

export async function removeMedia(mediaId: string) {
  await requireOwner();
  const m = await getMediaItem(mediaId);
  if (!m) return;
  await db.delete(s.media).where(eq(s.media.id, mediaId));
  await db.update(s.projects).set({ coverMediaId: null }).where(and(eq(s.projects.id, m.projectId), eq(s.projects.coverMediaId, mediaId)));
  await Promise.all([m.storageKey, m.thumbKey, m.previewKey, m.webKey].filter((k): k is string => !!k).map((k) => storage.deleteObject(k).catch(() => {})));
  revalidatePath(`/studio/projects/${m.projectId}`);
}

export async function setCover(projectId: string, mediaId: string) {
  await requireOwner();
  await db.update(s.projects).set({ coverMediaId: mediaId }).where(eq(s.projects.id, projectId));
  refresh();
}

export async function addTourLink(projectId: string, fd: FormData) {
  await requireOwner();
  const url = str(fd, "url");
  if (!/^https:\/\/\S+$/.test(url)) redirect(back(`/studio/projects/${projectId}`, { error: "tour" }));
  await db.insert(s.media).values({ id: newId("med"), projectId, kind: "tour", filename: str(fd, "label") || "3D Tour", externalUrl: url, contentType: "text/uri-list" });
  revalidatePath(`/studio/projects/${projectId}`);
}

/* ================= Delivery and invoices ================= */

async function createInvoiceFor(project: Project, status: "draft" | "sent") {
  const svc = project.serviceIds.length ? await db.select().from(s.services).where(inArray(s.services.id, project.serviceIds)) : [];
  const pkg = project.packageId ? (await db.select().from(s.packages).where(eq(s.packages.id, project.packageId)))[0] : undefined;
  // Bill the package at its bundle price if it still covers the booked services; extras on top.
  const bundled = pkg && pkg.serviceIds.every((id) => project.serviceIds.includes(id)) ? new Set(pkg.serviceIds) : null;
  const stock = await getStockPacks(project.stockPackIds);
  const now = new Date();
  const days = Number(process.env.INVOICE_DUE_DAYS || 7);
  const id = newId("inv");
  await db.insert(s.invoices).values({
    id,
    number: nextInvoiceNumber(await allInvoiceNumbers()),
    projectId: project.id,
    clientId: project.clientId,
    status,
    lines: [
      ...(bundled && pkg ? [{ description: `${pkg.name} package`, quantity: 1, unitPrice: pkg.price }] : []),
      ...svc.filter((x) => !bundled?.has(x.id)).map((x) => ({ description: x.name, quantity: 1, unitPrice: x.price })),
      ...stock.map((x) => ({ description: `Local area stock: ${x.name}`, quantity: 1, unitPrice: x.price })),
    ],
    taxRate: Number(process.env.DEFAULT_TAX_RATE || 0),
    issuedAt: now.toISOString(),
    dueAt: new Date(now.getTime() + days * 86_400_000).toISOString(),
  });
  await db.update(s.projects).set({ invoiceId: id }).where(eq(s.projects.id, project.id));
  return (await getInvoice(id))!;
}

export async function createDraftInvoice(projectId: string) {
  await requireOwner();
  const project = await getProject(projectId);
  if (!project || project.invoiceId) return;
  const inv = await createInvoiceFor(project, "draft");
  refresh();
  redirect(`/studio/invoices/${inv.id}`);
}

/** Marks the project delivered, sends the invoice, and emails the agent. */
export async function deliverProject(projectId: string) {
  await requireOwner();
  const project = await getProject(projectId);
  if (!project) return;
  let inv = await getInvoice(project.invoiceId);
  if (!inv) inv = await createInvoiceFor(project, "sent");
  else if (inv.status === "draft") {
    await db.update(s.invoices).set({ status: "sent", issuedAt: new Date().toISOString() }).where(eq(s.invoices.id, inv.id));
    inv = (await getInvoice(inv.id))!;
  }
  const deliveredAt = new Date().toISOString();
  await db.update(s.projects).set({ status: "delivered", deliveredAt }).where(eq(s.projects.id, projectId));
  const count = (await db.select({ n: sql<number>`count(*)::int` }).from(s.media).where(eq(s.media.projectId, projectId)))[0].n;
  await logActivity("delivery", `Delivered ${count} files for ${project.address}`, { projectId, clientId: project.clientId });
  await notifyDelivered((await getClient(project.clientId))!, { ...project, status: "delivered", deliveredAt }, inv, count);
  refresh();
}

export async function sendInvoice(invoiceId: string) {
  await requireOwner();
  const inv = await getInvoice(invoiceId);
  if (!inv) return;
  if (inv.status === "draft") await db.update(s.invoices).set({ status: "sent", issuedAt: new Date().toISOString() }).where(eq(s.invoices.id, invoiceId));
  const [project, client] = await Promise.all([getProject(inv.projectId), getClient(inv.clientId)]);
  if (project && client) await notifyInvoiceSent(client, project, { ...inv, status: "sent" });
  refresh();
  redirect(back(`/studio/invoices/${invoiceId}`, { sent: "1" }));
}

export async function markInvoicePaidManually(invoiceId: string) {
  await requireOwner();
  await markInvoicePaid(invoiceId, "manual");
}

export async function voidInvoice(invoiceId: string) {
  await requireOwner();
  await db.update(s.invoices).set({ status: "void" }).where(eq(s.invoices.id, invoiceId));
  refresh();
}

export async function updateInvoice(invoiceId: string, fd: FormData) {
  await requireOwner();
  const inv = await getInvoice(invoiceId);
  if (!inv || inv.status === "paid") redirect(`/studio/invoices/${invoiceId}`);
  const desc = fd.getAll("description").map(String);
  const qty = fd.getAll("quantity").map((q) => Number(q) || 0);
  const price = fd.getAll("unitPrice").map((p) => Math.round((Number(String(p).replace(/[$,]/g, "")) || 0) * 100));
  const lines = desc
    .map((d, i) => ({ description: d.trim(), quantity: qty[i] ?? 1, unitPrice: price[i] ?? 0 }))
    .filter((l) => l.description && l.quantity > 0);
  const taxPct = Number(str(fd, "taxRate")) || 0;
  const due = str(fd, "dueAt");
  await db
    .update(s.invoices)
    .set({
      lines,
      taxRate: Math.min(Math.max(taxPct, 0), 100) / 100,
      ...(due && { dueAt: new Date(`${due}T17:00:00`).toISOString() }),
    })
    .where(eq(s.invoices.id, invoiceId));
  refresh();
  redirect(back(`/studio/invoices/${invoiceId}`, { saved: "1" }));
}

/* ================= Agent: payment ================= */

/**
 * Sends the agent to pay. Works from the portal (signed in) and from the
 * stand-alone delivery page (token), and returns them to the page they came from.
 */
export async function startCheckout(invoiceId: string, tokenArg?: string) {
  const token = typeof tokenArg === "string" && tokenArg ? tokenArg : undefined;
  const inv = await getInvoice(invoiceId);
  const project = await getProject(inv?.projectId);
  const viewer = project && (await viewerFor(project, token));
  const home = token ? `/d/${token}` : "/portal";
  if (!inv || !project || !viewer || viewer.kind === "owner" || (inv.status !== "sent" && inv.status !== "overdue")) redirect(home);
  const backPath = viewer.kind === "link" ? `/d/${token}` : `/portal/properties/${project.id}`;
  if (payments.name === "mock" && !mockCheckoutAllowed()) redirect(back(backPath, { pay: "offline" }));
  const client = await getClient(project.clientId);
  const checkout = await payments.createCheckoutSession({
    invoiceId: inv.id,
    invoiceNumber: inv.number,
    amountCents: invoiceTotal(inv).total,
    customerEmail: client?.email ?? "",
    description: project.address,
    successUrl: appUrl(`${backPath}?paid=1`),
    cancelUrl: appUrl(backPath),
  });
  redirect(checkout.url);
}

/** Only for the built-in demo checkout. With Stripe, the webhook does this. */
export async function completeMockCheckout(fd: FormData) {
  if (payments.name !== "mock" || !mockCheckoutAllowed()) redirect("/");
  const inv = await getInvoice(str(fd, "invoice"));
  const project = await getProject(inv?.projectId);
  const viewer = project && (await viewerFor(project, str(fd, "token") || null));
  if (!inv || !project || !viewer) redirect("/");
  await markInvoicePaid(inv.id, str(fd, "session") || "mock");
  const success = str(fd, "success");
  redirect(success.startsWith("/") && !success.startsWith("//") ? success : `/portal/properties/${project.id}?paid=1`);
}

/** Owner: issue a fresh delivery link (the old one stops working). */
export async function rotateDeliveryLink(projectId: string) {
  await requireOwner();
  await db.update(s.projects).set({ deliveryToken: newToken() }).where(eq(s.projects.id, projectId));
  revalidatePath(`/studio/projects/${projectId}`);
}

/* ================= Catalog ================= */

export async function saveService(fd: FormData) {
  await requireOwner();
  const id = str(fd, "id") || newId("svc");
  const values = {
    name: str(fd, "name"),
    kind: (str(fd, "kind") || "photo") as (typeof s.services.$inferInsert)["kind"],
    description: str(fd, "description"),
    price: cents(fd, "price"),
    durationMin: Math.max(15, num(fd, "durationMin") ?? 60),
  };
  if (!values.name) redirect(back("/studio/settings/catalog", { error: "missing" }));
  await db.insert(s.services).values({ id, ...values }).onConflictDoUpdate({ target: s.services.id, set: values });
  refresh();
  redirect(back("/studio/settings/catalog", { saved: "1" }));
}

export async function setServiceActive(id: string, active: boolean) {
  await requireOwner();
  await db.update(s.services).set({ active }).where(eq(s.services.id, id));
  refresh();
}

export async function savePackage(fd: FormData) {
  await requireOwner();
  const id = str(fd, "id") || newId("pkg");
  const values = {
    name: str(fd, "name"),
    description: str(fd, "description"),
    price: cents(fd, "price"),
    serviceIds: fd.getAll("serviceIds").map(String),
    popular: !!fd.get("popular"),
  };
  if (!values.name || !values.serviceIds.length) redirect(back("/studio/settings/catalog", { error: "package" }));
  if (values.popular) await db.update(s.packages).set({ popular: false });
  await db.insert(s.packages).values({ id, ...values }).onConflictDoUpdate({ target: s.packages.id, set: values });
  refresh();
  redirect(back("/studio/settings/catalog", { saved: "1" }));
}

export async function setPackageActive(id: string, active: boolean) {
  await requireOwner();
  await db.update(s.packages).set({ active }).where(eq(s.packages.id, id));
  refresh();
}

/* ================= Integrations ================= */

export async function disconnectGoogleCalendar() {
  await requireOwner();
  const { disconnectGoogle } = await import("./integrations/calendar");
  await disconnectGoogle();
  refresh();
}

/* ================= Branding images (logos, profile photos) ================= */

type ImageKind = "client-logo" | "client-photo" | "brokerage-logo";

async function canEditImage(kind: ImageKind, targetId: string) {
  const sess = await getSession();
  if (!sess) return false;
  if (sess.role === "owner") return true;
  return kind !== "brokerage-logo" && sess.clientId === targetId;
}

export async function prepareImageUpload(kind: ImageKind, targetId: string, contentType: string) {
  if (!(await canEditImage(kind, targetId))) throw new Error("Not allowed");
  const ext = contentType === "image/png" ? "png" : "jpg";
  const key = `branding/${targetId}/${kind}-${newId("v", 6).slice(2)}.${ext}`;
  const t = await storage.createUploadTarget(key, contentType);
  return { key, url: t.url, headers: t.headers };
}

export async function saveImage(kind: ImageKind, targetId: string, key: string | null) {
  if (!(await canEditImage(kind, targetId))) throw new Error("Not allowed");
  if (key && !key.startsWith(`branding/${targetId}/${kind}-`)) throw new Error("Bad key");
  if (kind === "brokerage-logo") await db.update(s.brokerages).set({ logoKey: key }).where(eq(s.brokerages.id, targetId));
  else await db.update(s.clients).set(kind === "client-logo" ? { logoKey: key } : { photoKey: key }).where(eq(s.clients.id, targetId));
  refresh();
}

/* ================= Brokerages ================= */

export async function saveBrokerage(fd: FormData) {
  await requireOwner();
  const id = str(fd, "id") || newId("brk");
  const color = /^#[0-9a-f]{6}$/i.test(str(fd, "color")) ? str(fd, "color") : "#2b5d4f";
  const values = { name: str(fd, "name"), color, website: str(fd, "website"), phone: str(fd, "phone"), address: str(fd, "address") };
  if (!values.name) redirect(back("/studio/brokerages", { error: "missing" }));
  await db.insert(s.brokerages).values({ id, ...values }).onConflictDoUpdate({ target: s.brokerages.id, set: values });
  refresh();
  redirect(back("/studio/brokerages", { saved: id }));
}

/** Agents (or the owner on their behalf) link to a brokerage and fill in branding details. */
export async function updateAgentBranding(clientId: string, fd: FormData) {
  const sess = await getSession();
  if (!sess || (sess.role === "client" && sess.clientId !== clientId)) redirect("/login");
  const brokerageId = str(fd, "brokerageId") || null;
  const brokerage = brokerageId ? (await db.select().from(s.brokerages).where(eq(s.brokerages.id, brokerageId)))[0] : undefined;
  await db
    .update(s.clients)
    .set({
      brokerageId: brokerage?.id ?? null,
      ...(brokerage && { brokerage: brokerage.name }),
      website: str(fd, "website"),
      licenseNo: str(fd, "licenseNo"),
    })
    .where(eq(s.clients.id, clientId));
  refresh();
  redirect(sess.role === "owner" ? back(`/studio/clients/${clientId}`, { saved: "1" }) : back("/portal/account", { saved: "1" }));
}

/* ================= Property websites ================= */

export async function updatePropertySite(projectId: string, fd: FormData) {
  const sess = await getSession();
  const project = await getProject(projectId);
  if (!sess || !project || (sess.role === "client" && project.clientId !== sess.clientId)) redirect("/login");
  const template = str(fd, "siteTemplate");
  await db
    .update(s.projects)
    .set({
      siteTemplate: template === "modern" || template === "minimal" ? template : "classic",
      siteHeadline: str(fd, "siteHeadline").slice(0, 120) || null,
      mlsDescription: str(fd, "mlsDescription").slice(0, 5000) || null,
      features: parseFeatures(str(fd, "features")),
      sitePublished: !!fd.get("sitePublished"),
      siteSlug: project.siteSlug ?? (await siteSlugFor(project.address)),
    })
    .where(eq(s.projects.id, projectId));
  refresh();
  const base = sess.role === "owner" ? `/studio/projects/${projectId}/site` : `/portal/properties/${projectId}/site`;
  redirect(back(base, { saved: "1" }));
}

/* ================= Delivery message templates ================= */

export async function saveDeliveryTemplates(fd: FormData) {
  await requireOwner();
  const raw = (k: string) => String(fd.get(k) ?? "").replace(/\r\n/g, "\n").trim();
  const t = {
    emailSubject: raw("emailSubject") || DEFAULT_TEMPLATES.emailSubject,
    emailBody: raw("emailBody") || DEFAULT_TEMPLATES.emailBody,
    emailUnpaidLine: raw("emailUnpaidLine"),
    sms: (raw("sms") || DEFAULT_TEMPLATES.sms).slice(0, 640),
    sendSms: fd.get("sendSms") === "on",
  };
  await saveTemplates(t);
  redirect(back("/studio/settings/messages", { saved: "1" }));
}

export async function resetDeliveryTemplates() {
  await requireOwner();
  await saveTemplates(DEFAULT_TEMPLATES);
  redirect(back("/studio/settings/messages", { saved: "reset" }));
}

/* ================= Location zones and stock packs ================= */

const list = (raw: string) =>
  Array.from(
    new Set(
      raw
        .split(/[\n,;]+/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );

export async function saveZone(fd: FormData) {
  await requireOwner();
  const id = str(fd, "id") || newId("zon");
  const values = {
    name: str(fd, "name"),
    zips: list(str(fd, "zips")).map((z) => z.slice(0, 5)).filter((z) => /^\d{5}$/.test(z)),
    cities: list(str(fd, "cities")),
    // Edit form posts a hidden "off" plus the checkbox's "on"; the new-zone form posts neither.
    active: fd.has("active") ? fd.getAll("active").includes("on") : true,
  };
  if (!values.name || (!values.zips.length && !values.cities.length)) redirect(back("/studio/settings/zones", { error: "zone" }));
  await db.insert(s.zones).values({ id, ...values }).onConflictDoUpdate({ target: s.zones.id, set: values });
  redirect(back("/studio/settings/zones", { saved: "1" }));
}

export async function deleteZone(id: string) {
  await requireOwner();
  const packs = await db.select({ id: s.stockPacks.id }).from(s.stockPacks).where(eq(s.stockPacks.zoneId, id));
  const items = packs.length ? await db.select().from(s.stockMedia).where(inArray(s.stockMedia.packId, packs.map((p) => p.id))) : [];
  await db.delete(s.zones).where(eq(s.zones.id, id));
  await Promise.all(items.flatMap((m) => [m.storageKey, m.thumbKey, m.previewKey, m.webKey]).filter((k): k is string => !!k).map((k) => storage.deleteObject(k).catch(() => {})));
  revalidatePath("/studio/settings/zones");
}

export async function saveStockPack(fd: FormData) {
  await requireOwner();
  const id = str(fd, "id") || newId("stk");
  const values = { zoneId: str(fd, "zoneId"), name: str(fd, "name"), description: str(fd, "description"), price: cents(fd, "price") };
  if (!values.name || !values.zoneId) redirect(back("/studio/settings/zones", { error: "pack" }));
  await db.insert(s.stockPacks).values({ id, ...values }).onConflictDoUpdate({ target: s.stockPacks.id, set: values });
  redirect(back(`/studio/settings/zones/${id}`, { saved: "1" }));
}

export async function setStockPackActive(id: string, active: boolean) {
  await requireOwner();
  await db.update(s.stockPacks).set({ active }).where(eq(s.stockPacks.id, id));
  revalidatePath("/studio/settings/zones", "layout");
}

const stockKey = (packId: string, itemId: string, name: string) => `stock/${packId}/${itemId}/${name.replace(/[^\w.\-]+/g, "_")}`;

/** Presigned URLs for stock photos (original plus the three browser-made sizes). */
export async function prepareStockUploads(packId: string, files: UploadRequest[]): Promise<UploadPlan[]> {
  await requireOwner();
  if (!(await getStockPacks([packId])).length) throw new Error("Pack not found");
  return Promise.all(
    files
      .filter((f) => f.derivatives)
      .slice(0, 200)
      .map(async (f) => {
        const mediaId = newId("stm");
        const target = async (name: string, type: string) => {
          const key = stockKey(packId, mediaId, name);
          const t = await storage.createUploadTarget(key, type);
          return { key, url: t.url, headers: t.headers };
        };
        return {
          mediaId,
          original: await target(`original-${f.name}`, f.type),
          thumb: await target("thumb.jpg", "image/jpeg"),
          preview: await target("preview.jpg", "image/jpeg"),
          web: await target("web.jpg", "image/jpeg"),
        };
      }),
  );
}

export async function completeStockUploads(packId: string, files: UploadedFile[]) {
  await requireOwner();
  const prefix = `stock/${packId}/`;
  const rows = files
    .filter((f) => [f.keys.original, f.keys.thumb, f.keys.preview, f.keys.web].every((k) => !k || k.startsWith(`${prefix}${f.mediaId}/`)))
    .map((f) => ({
      id: f.mediaId,
      packId,
      filename: f.name,
      contentType: f.type,
      storageKey: f.keys.original,
      thumbKey: f.keys.thumb ?? null,
      previewKey: f.keys.preview ?? null,
      webKey: f.keys.web ?? null,
      sizeBytes: Math.round(f.size),
      width: f.width ? Math.round(f.width) : null,
      height: f.height ? Math.round(f.height) : null,
      seed: Math.floor(Math.random() * 5000),
    }));
  if (rows.length) await db.insert(s.stockMedia).values(rows).onConflictDoNothing();
  revalidatePath(`/studio/settings/zones/${packId}`);
}

export async function removeStockItem(id: string) {
  await requireOwner();
  const [m] = await db.delete(s.stockMedia).where(eq(s.stockMedia.id, id)).returning();
  if (!m) return;
  await Promise.all([m.storageKey, m.thumbKey, m.previewKey, m.webKey].filter((k): k is string => !!k).map((k) => storage.deleteObject(k).catch(() => {})));
  revalidatePath(`/studio/settings/zones/${m.packId}`);
}
