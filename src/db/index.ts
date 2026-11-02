import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and point it at a Postgres database.");

// One connection pool per server process (and per hot reload in dev).
const g = globalThis as unknown as { __rpdSql?: ReturnType<typeof postgres> };
const sql = (g.__rpdSql ??= postgres(url, { max: process.env.VERCEL ? 1 : 10, prepare: false }));

export const db = drizzle(sql, { schema });
export { schema };
