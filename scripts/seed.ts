// Loads demo data: catalog, six agents, projects, shoots, invoices and an owner.
//   npm run db:seed            adds demo data to an empty database
//   npm run db:seed -- --reset wipes every table first
// Logins: OWNER_EMAIL / SEED_PASSWORD (defaults owner@example.com / demo1234),
// and each agent's email with the same password (e.g. maya@summitrealty.com).
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "../src/db/schema";
import { loadEnv } from "./env";
import { buildSeed } from "./seed-data";

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql, { schema: s });

  if (process.argv.includes("--reset")) {
    await sql`truncate table activity, auth_tokens, media, invoices, shoots, projects, users, packages, services, clients, settings cascade`;
  } else if ((await db.select().from(s.clients).limit(1)).length) {
    console.log("Database already has data. Run with --reset to replace it.");
    await sql.end();
    return;
  }

  const seed = buildSeed();
  const password = await bcrypt.hash(process.env.SEED_PASSWORD || "demo1234", 12);

  await db.insert(s.services).values(seed.services.map((x, i) => ({ ...x, sort: i })));
  await db.insert(s.packages).values(seed.packages.map((x, i) => ({ ...x, popular: !!x.popular, sort: i })));
  await db.insert(s.clients).values(seed.clients.map((c) => ({ ...c, notes: c.notes ?? null })));
  await db.insert(s.users).values([
    { id: "usr_owner", email: (process.env.OWNER_EMAIL || "owner@example.com").toLowerCase(), name: process.env.NEXT_PUBLIC_PHOTOGRAPHER_NAME || "Jonathan", role: "owner", passwordHash: password },
    ...seed.clients.map((c) => ({ id: `usr_${c.id}`, email: c.email, name: c.name, role: "client" as const, clientId: c.id, passwordHash: password })),
  ]);

  await db.insert(s.projects).values(
    seed.projects.map((p) => ({ ...p, beds: p.beds ?? null, baths: p.baths ?? null, sqft: p.sqft ?? null, shootId: p.shootId ?? null, invoiceId: p.invoiceId ?? null, deliveredAt: p.deliveredAt ?? null })),
  );
  await db.insert(s.shoots).values(seed.shoots.map((x) => ({ ...x, accessNotes: x.accessNotes ?? null, calendarEventId: null })));
  await db.insert(s.invoices).values(seed.invoices.map((x) => ({ ...x, paidAt: x.paidAt ?? null, paymentRef: x.paymentRef ?? null })));
  // Seeded media has no files; the app draws placeholder art until real uploads replace it.
  await db.insert(s.media).values(seed.media.map((m, i) => ({ ...m, contentType: m.kind === "video" ? "video/mp4" : m.kind === "floorplan" ? "application/pdf" : "image/jpeg", externalUrl: m.externalUrl ?? null, width: m.width ?? null, height: m.height ?? null, durationSec: m.durationSec ?? null, sort: i })));
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
      await db.insert(s.projects).values({ id: pid, clientId: client.id, address: `${100 + k * 37 + j * 11} ${["Oak", "Cedar", "Pine", "Willow", "Aspen"][j % 5]} Street`, city: "Redding", state: "CA", zip: "96001", status: "archived", serviceIds: pkg.serviceIds, invoiceId: iid, coverSeed: k * 13 + j, createdAt: day.toISOString(), deliveredAt: day.toISOString() });
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
