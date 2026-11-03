// Loads demo data: catalog, six agents, projects, shoots, invoices and an owner.
//   npm run db:seed            adds demo data to an empty database
//   npm run db:seed -- --reset wipes every table first
// Logins: OWNER_EMAIL / SEED_PASSWORD (defaults owner@example.com / demo1234),
// and each agent's email with the same password (e.g. maya@summitrealty.com).
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "../src/db/schema";
import { loadEnv } from "./env";
import { buildSeed } from "./seed-data";
import { floorPlanPdf, logoPng, seedPhoto, writeLocal } from "./seed-images";

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql, { schema: s });

  if (process.argv.includes("--reset")) {
    await sql`truncate table staging_requests, stock_media, stock_packs, zones, activity, auth_tokens, media, invoices, shoots, projects, users, packages, services, clients, brokerages, settings cascade`;
  } else if ((await db.select().from(s.clients).limit(1)).length) {
    console.log("Database already has data. Run with --reset to replace it.");
    await sql.end();
    return;
  }

  const seed = buildSeed();
  const password = await bcrypt.hash(process.env.SEED_PASSWORD || "demo1234", 12);

  await db.insert(s.services).values(seed.services.map((x, i) => ({ ...x, sort: i })));
  await db.insert(s.packages).values(seed.packages.map((x, i) => ({ ...x, popular: !!x.popular, sort: i })));
  // Draw real image files only for local storage; with S3, upload real media instead.
  const files = process.env.STORAGE_PROVIDER !== "s3";
  const mark = `${(process.env.NEXT_PUBLIC_STUDIO_SHORT_NAME || process.env.NEXT_PUBLIC_STUDIO_NAME || "Northlight").toUpperCase()} · PREVIEW`;

  // A brokerage whose logo and color Maya's property sites inherit.
  const summitLogo = files ? "brokerages/brk_summit/logo.png" : null;
  if (summitLogo) await writeLocal(summitLogo, await logoPng("Summit Realty", "#1f4e79"));
  await db.insert(s.brokerages).values({ id: "brk_summit", name: "Summit Realty Group", color: "#1f4e79", logoKey: summitLogo, website: "https://example.com/summit", phone: "(530) 555-0100", address: "1500 Court St, Redding, CA" });
  await db.insert(s.clients).values(
    seed.clients.map((c) => ({ ...c, notes: c.notes ?? null, ...(c.id === "cli_maya" && { brokerageId: "brk_summit", website: "https://example.com/maya", licenseNo: "02145678" }) })),
  );
  await db.insert(s.users).values([
    { id: "usr_owner", email: (process.env.OWNER_EMAIL || "owner@example.com").toLowerCase(), name: process.env.NEXT_PUBLIC_PHOTOGRAPHER_NAME || "Jonathan", role: "owner", passwordHash: password },
    ...seed.clients.map((c) => ({ id: `usr_${c.id}`, email: c.email, name: c.name, role: "client" as const, clientId: c.id, passwordHash: password })),
  ]);

  const listing: Record<string, { features: string[]; acreage?: number; headline?: string; mls?: string; template?: "classic" | "modern" | "minimal" }> = {
    prj_1: {
      features: ["Lake views", "Chef's kitchen with quartz counters", "Primary suite on the main floor", "Three-car garage", "Owned solar"],
      acreage: 0.42,
      headline: "Lakeside living with room to spread out",
      mls: "Bright, open and freshly updated, this four-bedroom home sits on a quiet street minutes from Lake Redding. The chef's kitchen opens to a vaulted living room with walls of windows, and the main-floor primary suite has a spa bath and walk-in closet.\n\nOutside, a covered patio looks over a landscaped yard with mature oaks. Owned solar keeps summer bills low.",
    },
    prj_2: { features: ["Twilight views over the valley", "Updated kitchen", "Fenced backyard"], acreage: 0.21, template: "modern" },
    prj_3: { features: ["Five bedrooms, four baths", "Pool and spa", "RV parking", "Detached shop", "Wine cellar"], acreage: 1.6, headline: "Estate living on 1.6 acres", template: "minimal" },
    prj_11: { features: ["Creekside lot", "New roof", "Open floor plan"], acreage: 0.5 },
  };
  await db.insert(s.projects).values(
    seed.projects.map((p) => ({
      ...p,
      beds: p.beds ?? null,
      baths: p.baths ?? null,
      sqft: p.sqft ?? null,
      shootId: p.shootId ?? null,
      invoiceId: p.invoiceId ?? null,
      deliveredAt: p.deliveredAt ?? null,
      siteSlug: `${p.address.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${p.id.replace("prj_", "")}`,
      deliveryToken: randomBytes(16).toString("hex"),
      features: listing[p.id]?.features ?? [],
      acreage: listing[p.id]?.acreage ?? null,
      siteHeadline: listing[p.id]?.headline ?? null,
      mlsDescription: listing[p.id]?.mls ?? null,
      siteTemplate: listing[p.id]?.template ?? "classic",
    })),
  );
  await db.insert(s.shoots).values(seed.shoots.map((x) => ({ ...x, accessNotes: x.accessNotes ?? null, calendarEventId: null })));
  await db.insert(s.invoices).values(seed.invoices.map((x) => ({ ...x, paidAt: x.paidAt ?? null, paymentRef: x.paymentRef ?? null })));
  // Photos and floor plans get real files (local storage only). Videos stay as
  // placeholders with no file, and tours point at public sample embeds.
  const rows = [];
  for (const [i, m] of seed.media.entries()) {
    const base = { ...m, contentType: m.kind === "video" ? "video/mp4" : m.kind === "floorplan" ? "application/pdf" : "image/jpeg", externalUrl: m.externalUrl ?? null, width: m.width ?? null, height: m.height ?? null, durationSec: m.durationSec ?? null, sort: i };
    const prefix = `projects/${m.projectId}/${m.id}`;
    if (files && m.kind === "photo") rows.push({ ...base, ...(await seedPhoto(prefix, m.seed, m.filename, mark)) });
    else if (files && m.kind === "floorplan") {
      const pdf = floorPlanPdf("Floor plan");
      await writeLocal(`${prefix}/original-${m.filename}`, pdf);
      rows.push({ ...base, storageKey: `${prefix}/original-${m.filename}`, sizeBytes: pdf.length });
    } else if (m.kind === "video") rows.push({ ...base, storageKey: "" });
    else if (m.kind === "tour") rows.push({ ...base, filename: "Matterport 3D tour", externalUrl: "https://my.matterport.com/show/?m=SxQL3iGyoDo" });
    else rows.push(base);
  }
  for (const p of seed.projects.filter((x) => seed.media.some((m) => m.projectId === x.id && m.kind === "video"))) {
    rows.push({ id: `med_${p.id}_vimeo`, projectId: p.id, kind: "tour" as const, filename: "Cinematic walkthrough (Vimeo)", storageKey: "", externalUrl: "https://vimeo.com/76979871", contentType: "text/uri-list", sizeBytes: 0, width: null, height: null, durationSec: null, seed: 1, sort: 999, uploadedAt: p.deliveredAt ?? new Date().toISOString() });
  }
  await db.insert(s.media).values(rows);
  for (const p of seed.projects) {
    const cover = rows.find((m) => m.projectId === p.id && m.kind === "photo");
    if (cover) await db.update(s.projects).set({ coverMediaId: cover.id }).where(eq(s.projects.id, p.id));
  }

  // A location zone with a local-area stock pack, offered when booking in Redding.
  await db.insert(s.zones).values({ id: "zon_redding", name: "Redding", zips: ["96001", "96002", "96003"], cities: ["Redding"] });
  await db.insert(s.stockPacks).values({ id: "stk_redding", zoneId: "zon_redding", name: "Redding landmarks", description: "Sundial Bridge, the Sacramento River Trail and Mount Shasta views.", price: 4900 });
  const landmarks = ["sundial-bridge.jpg", "river-trail.jpg", "mount-shasta.jpg", "whiskeytown-lake.jpg", "downtown.jpg", "turtle-bay.jpg"];
  const stock = [];
  for (const [i, name] of landmarks.entries()) {
    const id = `stm_redding_${i}`;
    const f = files ? await seedPhoto(`stock/stk_redding/${id}`, 500 + i * 17, name, mark, "landscape") : { storageKey: `stock/stk_redding/${id}/original-${name}`, thumbKey: null, previewKey: null, webKey: null, sizeBytes: 0, width: null, height: null };
    stock.push({ id, packId: "stk_redding", filename: name, contentType: "image/jpeg", seed: 500 + i, ...f });
  }
  await db.insert(s.stockMedia).values(stock);
  // Maya's lakeside listing came with the pack.
  await db.update(s.projects).set({ stockPackIds: ["stk_redding"] }).where(eq(s.projects.id, "prj_1"));
  // Maya already bought the staging add-on for this listing.
  await db.update(s.projects).set({ stagingUnlockedAt: new Date().toISOString() }).where(eq(s.projects.id, "prj_1"));
  await db.insert(s.activity).values(seed.activity.map((a) => ({ ...a, projectId: a.projectId ?? null, clientId: a.clientId ?? null })));

  // A few months of past, paid work so the revenue chart has history.
  const now = new Date();
  let n = 1100;
  for (let k = 1; k <= 5; k++) {
    for (let j = 0; j < 4 + (k % 3); j++) {
      const client = seed.clients[(k + j) % seed.clients.length];
      const pkg = seed.packages[(k * j + j) % seed.packages.length];
      const day = new Date(now.getFullYear(), now.getMonth() - k, 3 + j * 5, 15);
      const pid = `prj_hist_${k}_${j}`;
      const iid = `inv_hist_${k}_${j}`;
      await db.insert(s.projects).values({ id: pid, deliveryToken: randomBytes(16).toString("hex"), clientId: client.id, address: `${100 + k * 37 + j * 11} ${["Oak", "Cedar", "Pine", "Willow", "Aspen"][j % 5]} Street`, city: "Redding", state: "CA", zip: "96001", status: "archived", serviceIds: pkg.serviceIds, invoiceId: iid, coverSeed: k * 13 + j, createdAt: day.toISOString(), deliveredAt: day.toISOString() });
      await db.insert(s.invoices).values({ id: iid, number: `INV-${n++}`, projectId: pid, clientId: client.id, status: "paid", lines: [{ description: `${pkg.name} package`, quantity: 1, unitPrice: pkg.price }], taxRate: 0, issuedAt: day.toISOString(), dueAt: day.toISOString(), paidAt: day.toISOString(), paymentRef: "seed" });
    }
  }

  console.log(`Seeded ${seed.clients.length} clients, ${seed.projects.length} projects. Password for every demo login: ${process.env.SEED_PASSWORD || "demo1234"}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
