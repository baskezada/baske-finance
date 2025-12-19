import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForDb(url: string) {
  const maxAttempts = 30;
  for (let i = 1; i <= maxAttempts; i++) {
    let sql;
    try {
      console.log(`[migrate] connection attempt ${i}...`);
      sql = postgres(url, {
        max: 1,
        connect_timeout: 5, // 5 seconds timeout
      });
      await sql`select 1`;
      console.log(`[migrate] connection successful`);
      await sql.end({ timeout: 2 });
      return;
    } catch (e: any) {
      console.log(`[migrate] attempt ${i} failed: ${e.message || e}`);
      if (sql) await sql.end().catch(() => { });
      if (i === maxAttempts) throw e;
      await sleep(2000);
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
