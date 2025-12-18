import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForDb(url: string) {
  const maxAttempts = 25;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const sql = postgres(url, { max: 1 });
      await sql`select 1`;
      await sql.end({ timeout: 2 });
      return;
    } catch (e) {
      if (i === maxAttempts) throw e;
      await sleep(800);
    }
  }
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  console.log("[migrate] waiting for db...");
  await waitForDb(url);

  console.log("[migrate] running migrations...");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("[migrate] done");
  } finally {
    await client.end({ timeout: 5 });
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
