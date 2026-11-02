import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = (await db.select().from(s.settings).where(eq(s.settings.key, key)))[0];
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(s.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: s.settings.key, set: { value, updatedAt: sql`now()` } });
}

export async function deleteSetting(key: string) {
  await db.delete(s.settings).where(eq(s.settings.key, key));
}
