import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { storage } from "./integrations";
import type { Client } from "./types";

export type Brokerage = typeof s.brokerages.$inferSelect;

export const getBrokerages = () => db.select().from(s.brokerages).orderBy(s.brokerages.name);
export const getBrokerage = async (id?: string | null) => (id ? (await db.select().from(s.brokerages).where(eq(s.brokerages.id, id)))[0] : undefined);

/** Resolve an agent's branding: their own logo wins, then their brokerage's. */
export async function agentBranding(client: Client) {
  const brokerage = await getBrokerage(client.brokerageId);
  const logoKey = client.logoKey ?? brokerage?.logoKey ?? null;
  return {
    brokerage,
    brokerageName: brokerage?.name ?? client.brokerage,
    source: client.logoKey ? ("agent" as const) : brokerage?.logoKey ? ("brokerage" as const) : ("none" as const),
    logoUrl: logoKey ? await storage.getPreviewUrl(logoKey) : null,
    photoUrl: client.photoKey ? await storage.getPreviewUrl(client.photoKey) : null,
    color: brokerage?.color ?? "#2b5d4f",
    website: client.website || brokerage?.website || "",
  };
}
