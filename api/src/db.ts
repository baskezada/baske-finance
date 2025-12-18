import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

export const sql = postgres(url, {
  max: 10,
  idle_timeout: 20
});

export const db = drizzle(sql);