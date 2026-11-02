// Applies SQL migrations in ./drizzle. Run with `npm run db:migrate`.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadEnv } from "./env";

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
