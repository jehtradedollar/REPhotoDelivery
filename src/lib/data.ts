import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { newId } from "./ids";
import { effectiveStatus } from "./invoice";
import { storage } from "./integrations";
import { downloadHref } from "./links";
import type { ActivityEvent, Client, Invoice, MediaItem, MediaView, Project, Shoot } from "./types";

export { invoiceTotal } from "./invoice";
export { newId };

/* ---------- Clients ---------- */

export async function getClients(opts: { includeArchived?: boolean } = {}) {
  return db
    .select()
    .from(s.clients)
    .where(opts.includeArchived ? undefined : eq(s.clients.archived, false))
    .orderBy(asc(s.clients.name));
}

export async function getClient(id?: string | null): Promise<Client | undefined> {
  if (!id) return undefined;
  return (await db.select().from(s.clients).where(eq(s.clients.id, id)))[0];
}

/* ---------- Projects ---------- */

export async function getProjects(filter: { clientId?: string } = {}) {
  return db
    .select()
    .from(s.projects)
    .where(filter.clientId ? eq(s.projects.clientId, filter.clientId) : undefined)
    .orderBy(desc(s.projects.createdAt));
}

export async function getProject(id?: string | null): Promise<Project | undefined> {
  if (!id) return undefined;
  return (await db.select().from(s.projects).where(eq(s.projects.id, id)))[0];
}

/* ---------- Shoots ---------- */

export async function getShoots(filter: { clientId?: string; from?: Date; to?: Date } = {}) {
  const where = [
    filter.clientId ? eq(s.shoots.clientId, filter.clientId) : undefined,
    filter.from ? gte(s.shoots.end, filter.from.toISOString()) : undefined,
    filter.to ? lt(s.shoots.start, filter.to.toISOString()) : undefined,
  ].filter(Boolean);
  return db
    .select()
    .from(s.shoots)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(s.shoots.start));
}

export async function getShoot(id?: string | null): Promise<Shoot | undefined> {
  if (!id) return undefined;
  return (await db.select().from(s.shoots).where(eq(s.shoots.id, id)))[0];
}

/** Time ranges already taken, for the booking slot picker. */
export async function getBusyRanges(from: Date, to: Date) {
  const rows = await db
    .select({ start: s.shoots.start, end: s.shoots.end })
    .from(s.shoots)
    .where(and(ne(s.shoots.status, "cancelled"), gte(s.shoots.end, from.toISOString()), lt(s.shoots.start, to.toISOString())));
  return rows;
}

/* ---------- Invoices ---------- */

const withStatus = (inv: Invoice): Invoice => ({ ...inv, status: effectiveStatus(inv) });

export async function getInvoices(filter: { clientId?: string } = {}) {
  const rows = await db
    .select()
    .from(s.invoices)
    .where(filter.clientId ? eq(s.invoices.clientId, filter.clientId) : undefined)
    .orderBy(desc(s.invoices.issuedAt));
  return rows.map(withStatus);
}

export async function getInvoice(id?: string | null): Promise<Invoice | undefined> {
  if (!id) return undefined;
  const row = (await db.select().from(s.invoices).where(eq(s.invoices.id, id)))[0];
  return row && withStatus(row);
}

export async function allInvoiceNumbers() {
  return (await db.select({ n: s.invoices.number }).from(s.invoices)).map((r) => r.n);
}

/** Downloads unlock once the project's invoice is paid (or there is no invoice). */
export async function isUnlocked(project: Project) {
  const inv = await getInvoice(project.invoiceId);
  return !inv || inv.status === "paid" || inv.status === "void";
}

/* ---------- Media ---------- */

export async function getMedia(projectId: string): Promise<MediaItem[]> {
  return db.select().from(s.media).where(eq(s.media.projectId, projectId)).orderBy(asc(s.media.sort), asc(s.media.filename));
}

export async function getMediaItem(id: string): Promise<MediaItem | undefined> {
  return (await db.select().from(s.media).where(eq(s.media.id, id)))[0];
}

/**
 * Swap storage keys for short-lived URLs. Locked galleries only get watermarked
 * previews. `token` is passed through to download links on the delivery page.
 */
export async function mediaViews(items: MediaItem[], unlocked: boolean, opts: { token?: string | null } = {}): Promise<MediaView[]> {
  return Promise.all(
    items.map(async (m) => {
      const viewKey = unlocked ? (m.webKey ?? m.previewKey) : m.previewKey;
      const isVideo = m.kind === "video";
      return {
        id: m.id,
        kind: m.kind,
        filename: m.filename,
        sizeBytes: m.sizeBytes,
        width: m.width,
        height: m.height,
        durationSec: m.durationSec,
        externalUrl: unlocked ? m.externalUrl : null,
        seed: m.seed,
        thumbUrl: m.thumbKey ? await storage.getPreviewUrl(m.thumbKey) : null,
        // Videos stream from the original once unlocked; before that, nothing to play.
        viewUrl: isVideo ? (unlocked && m.storageKey ? await storage.getPreviewUrl(m.storageKey) : null) : viewKey ? await storage.getPreviewUrl(viewKey) : null,
        downloadUrl: m.storageKey ? downloadHref(m.id, { token: opts.token }) : null,
        mlsUrl: m.kind === "photo" && m.webKey ? downloadHref(m.id, { token: opts.token, mls: true }) : null,
      };
    }),
  );
}

export async function coverUrl(project: Project) {
  if (!project.coverMediaId) return null;
  const m = await getMediaItem(project.coverMediaId);
  return m?.thumbKey ? storage.getPreviewUrl(m.thumbKey) : null;
}

/** Large cover image: clean once paid, watermarked before. */
export async function heroUrl(project: Project, unlocked: boolean) {
  const items = project.coverMediaId ? [await getMediaItem(project.coverMediaId)] : [];
  const m = items[0] ?? (await db.select().from(s.media).where(and(eq(s.media.projectId, project.id), eq(s.media.kind, "photo"))).orderBy(asc(s.media.sort)).limit(1))[0];
  const key = m && (unlocked ? (m.webKey ?? m.previewKey) : m.previewKey);
  return key ? storage.getPreviewUrl(key) : null;
}

/* ---------- Catalog ---------- */

export const getServices = (opts: { includeInactive?: boolean } = {}) =>
  db
    .select()
    .from(s.services)
    .where(opts.includeInactive ? undefined : eq(s.services.active, true))
    .orderBy(asc(s.services.sort), asc(s.services.name));

export const getPackages = (opts: { includeInactive?: boolean } = {}) =>
  db
    .select()
    .from(s.packages)
    .where(opts.includeInactive ? undefined : eq(s.packages.active, true))
    .orderBy(asc(s.packages.sort), asc(s.packages.price));

/* ---------- Activity ---------- */

export const getActivity = (limit = 20) => db.select().from(s.activity).orderBy(desc(s.activity.at)).limit(limit);

export async function logActivity(kind: ActivityEvent["kind"], text: string, ids: { projectId?: string; clientId?: string } = {}) {
  await db.insert(s.activity).values({ id: newId("act"), kind, text, projectId: ids.projectId ?? null, clientId: ids.clientId ?? null });
}

/* ---------- Composite rows ---------- */

export interface ProjectRow {
  project: Project;
  client?: Client;
  shoot?: Shoot;
  invoice?: Invoice;
  mediaCount: number;
  coverUrl: string | null;
}

export async function projectRows(filter: { clientId?: string } = {}): Promise<ProjectRow[]> {
  const projects = await getProjects(filter);
  if (!projects.length) return [];
  const ids = projects.map((p) => p.id);
  const [clients, shoots, invoices, media] = await Promise.all([
    db.select().from(s.clients).where(inArray(s.clients.id, [...new Set(projects.map((p) => p.clientId))])),
    db.select().from(s.shoots).where(inArray(s.shoots.projectId, ids)),
    db.select().from(s.invoices).where(inArray(s.invoices.projectId, ids)),
    db.select({ id: s.media.id, projectId: s.media.projectId, thumbKey: s.media.thumbKey }).from(s.media).where(inArray(s.media.projectId, ids)),
  ]);
  return Promise.all(
    projects.map(async (project) => {
      const cover = media.find((m) => m.id === project.coverMediaId) ?? media.find((m) => m.projectId === project.id && m.thumbKey);
      const inv = invoices.find((i) => i.id === project.invoiceId);
      return {
        project,
        client: clients.find((c) => c.id === project.clientId),
        shoot: shoots.find((x) => x.id === project.shootId),
        invoice: inv && withStatus(inv),
        mediaCount: media.filter((m) => m.projectId === project.id).length,
        coverUrl: cover?.thumbKey ? await storage.getPreviewUrl(cover.thumbKey) : null,
      };
    }),
  );
}

/** Lookup maps for list pages that need names next to ids. */
export async function lookups() {
  const [clients, projects] = await Promise.all([db.select().from(s.clients), db.select().from(s.projects)]);
  return {
    client: (id?: string | null) => clients.find((c) => c.id === id),
    project: (id?: string | null) => projects.find((p) => p.id === id),
  };
}

/** Busy time for the next few weeks: existing shoots plus the owner's Google Calendar. */
export async function bookingBusy(days = 21) {
  const from = new Date();
  const to = new Date(from.getTime() + days * 86_400_000);
  const { calendar } = await import("./integrations");
  const [shoots, external] = await Promise.all([getBusyRanges(from, to), calendar.getBusy(from, to).catch(() => [])]);
  return [...shoots, ...external];
}
