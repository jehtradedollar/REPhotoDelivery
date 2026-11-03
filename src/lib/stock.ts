import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { storage } from "./integrations";
import { stockHref } from "./links";
import type { MediaView, Project } from "./types";

export type Zone = typeof s.zones.$inferSelect;
export type StockPack = typeof s.stockPacks.$inferSelect;
export type StockItem = typeof s.stockMedia.$inferSelect;

const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

/** Zones whose ZIP list or city list covers this address. */
export async function zonesFor(zip: string, city: string) {
  const z5 = zip.trim().slice(0, 5);
  const c = norm(city);
  if (!z5 && !c) return [];
  const zones = await db.select().from(s.zones).where(eq(s.zones.active, true));
  return zones.filter((zone) => (z5 && zone.zips.includes(z5)) || (c && zone.cities.some((x) => norm(x) === c)));
}

/** Active packs (with at least one photo) available at this address. */
export async function packsFor(zip: string, city: string) {
  const zones = await zonesFor(zip, city);
  if (!zones.length) return [];
  const packs = await db
    .select()
    .from(s.stockPacks)
    .where(and(eq(s.stockPacks.active, true), inArray(s.stockPacks.zoneId, zones.map((z) => z.id))));
  if (!packs.length) return [];
  const items = await db.select().from(s.stockMedia).where(inArray(s.stockMedia.packId, packs.map((p) => p.id))).orderBy(asc(s.stockMedia.uploadedAt));
  return packs
    .map((p) => ({ pack: p, zone: zones.find((z) => z.id === p.zoneId)!, items: items.filter((i) => i.packId === p.id) }))
    .filter((x) => x.items.length > 0);
}

export async function getStockItems(packIds: string[]) {
  if (!packIds.length) return [];
  return db.select().from(s.stockMedia).where(inArray(s.stockMedia.packId, packIds)).orderBy(asc(s.stockMedia.uploadedAt));
}

export async function getStockPacks(ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(s.stockPacks).where(inArray(s.stockPacks.id, ids));
}

/** Stock photos included with a project, shaped for the gallery's "Local area" tab. */
export async function stockViews(project: Project, unlocked: boolean, opts: { token?: string | null } = {}): Promise<MediaView[]> {
  const items = await getStockItems(project.stockPackIds);
  return Promise.all(
    items.map(async (m) => ({
      id: m.id,
      kind: "photo" as const,
      group: "local" as const,
      filename: m.filename,
      sizeBytes: m.sizeBytes,
      width: m.width,
      height: m.height,
      durationSec: null,
      externalUrl: null,
      seed: m.seed,
      thumbUrl: m.thumbKey ? await storage.getPreviewUrl(m.thumbKey) : null,
      viewUrl: (unlocked ? (m.webKey ?? m.previewKey) : m.previewKey) ? await storage.getPreviewUrl((unlocked ? (m.webKey ?? m.previewKey) : m.previewKey)!) : null,
      downloadUrl: stockHref(project.id, m.id, { token: opts.token }),
      mlsUrl: m.webKey ? stockHref(project.id, m.id, { token: opts.token, mls: true }) : null,
    })),
  );
}
