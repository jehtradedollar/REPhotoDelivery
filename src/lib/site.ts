import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { isDelivered, viewerFor } from "./access";
import { agentBranding } from "./branding";
import { getClient, getMedia, isUnlocked } from "./data";
import { embedInfo } from "./embeds";
import { storage } from "./integrations";
import { getStockItems } from "./stock";
import type { Project } from "./types";

export type SiteTemplate = Project["siteTemplate"];
export const SITE_TEMPLATES: { key: SiteTemplate; name: string; blurb: string }[] = [
  { key: "classic", name: "Classic", blurb: "Full-width hero, serif headings, warm and timeless" },
  { key: "modern", name: "Modern", blurb: "Split hero in the brokerage color, bold and graphic" },
  { key: "minimal", name: "Minimal", blurb: "Quiet single column that lets the photos lead" },
];

export interface SitePhoto {
  id: string;
  url: string;
  thumb: string;
  alt: string;
}

/**
 * Everything a property website needs. Live once the project is delivered,
 * paid and published; before that only the studio and the agent can preview it.
 */
export async function loadSite(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const [project] = await db.select().from(s.projects).where(eq(s.projects.siteSlug, slug));
  if (!project) return null;
  const unlocked = await isUnlocked(project);
  const live = project.sitePublished && isDelivered(project) && unlocked;
  if (!live && !(await viewerFor(project))) return null;

  const client = (await getClient(project.clientId))!;
  const [branding, media, stock] = await Promise.all([agentBranding(client), getMedia(project.id), getStockItems(project.stockPackIds)]);
  const url = (k: string | null | undefined) => (k ? storage.getPreviewUrl(k) : Promise.resolve(null));
  // Clean images once paid; watermarked previews while the owner/agent previews an unpaid site.
  const big = (m: { webKey: string | null; previewKey: string | null }) => (unlocked ? (m.webKey ?? m.previewKey) : m.previewKey);

  const photoRows = media.filter((m) => m.kind === "photo" && (m.thumbKey || m.webKey));
  const cover = photoRows.find((m) => m.id === project.coverMediaId) ?? photoRows[0];
  const ordered = cover ? [cover, ...photoRows.filter((m) => m !== cover)] : photoRows;
  const photos: SitePhoto[] = (
    await Promise.all(ordered.map(async (m) => ({ id: m.id, url: (await url(big(m))) ?? "", thumb: (await url(m.thumbKey)) ?? "", alt: m.filename })))
  ).filter((p) => p.url);
  const local: SitePhoto[] = (await Promise.all(stock.map(async (m) => ({ id: m.id, url: (await url(big(m))) ?? "", thumb: (await url(m.thumbKey)) ?? "", alt: m.filename })))).filter((p) => p.url);

  const videos = unlocked ? (await Promise.all(media.filter((m) => m.kind === "video" && m.storageKey).map((m) => url(m.storageKey)))).filter((u): u is string => !!u) : [];
  const embeds = unlocked
    ? media
        .filter((m) => m.kind === "tour" && m.externalUrl)
        .map((m) => ({ id: m.id, title: m.filename, url: m.externalUrl!, ...embedInfo(m.externalUrl!) }))
    : [];
  const floorplans = unlocked ? await Promise.all(media.filter((m) => m.kind === "floorplan" && m.storageKey).map(async (m) => ({ id: m.id, name: m.filename, url: (await url(m.storageKey))! }))) : [];

  return { project, client, branding, live, photos, local, videos, embeds, floorplans };
}

export type SiteData = NonNullable<Awaited<ReturnType<typeof loadSite>>>;

/** Starter description used until the agent writes or pastes the MLS remarks. */
export function defaultDescription(p: Project) {
  const parts = [
    `Welcome to ${p.address}${p.city ? ` in ${p.city}` : ""}.`,
    [p.beds != null && `${p.beds} bedrooms`, p.baths != null && `${p.baths} bathrooms`, p.sqft != null && `${p.sqft.toLocaleString()} square feet`].filter(Boolean).join(", "),
    p.acreage != null ? `set on ${p.acreage} acres.` : "",
  ];
  const first = parts[1] ? `${parts[0]} This home offers ${parts[1]}${parts[2] ? `, ${parts[2]}` : "."}` : parts[0];
  const feats = p.features.length ? ` Highlights include ${p.features.slice(0, 6).join(", ").toLowerCase()}.` : "";
  return first + feats;
}
