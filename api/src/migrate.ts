import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { logger } from "./logger";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForDb(url: string) {
  const maxAttempts = 30;
  for (let i = 1; i <= maxAttempts; i++) {
    let sql;
    try {
      logger.info({ attempt: i }, `[migrate] connection attempt`);
      sql = postgres(url, {
        max: 1,
        connect_timeout: 5, // 5 seconds timeout
      });
      await sql`select 1`;
      logger.info(`[migrate] connection successful`);
      await sql.end({ timeout: 2 });
      return;
    } catch (e: any) {
      logger.warn({ attempt: i, error: e.message || e }, `[migrate] attempt failed`);
      if (sql) await sql.end().catch(() => { });
      if (i === maxAttempts) throw e;
      await sleep(2000);
    }
  }
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  logger.info("[migrate] waiting for db...");
  await waitForDb(url);

  logger.info("[migrate] running migrations...");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    logger.info("[migrate] done");
  } finally {
    await client.end({ timeout: 5 });
  }
}

run().catch((err) => {
  logger.error({ err }, "Migration failed");
  process.exit(1);
});
