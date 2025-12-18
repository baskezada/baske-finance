import { db, sql } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    if (url.pathname === "/users" && req.method === "GET") {
      const rows = await db.select().from(users).orderBy(users.id);
      return Response.json(rows);
    }

    if (url.pathname === "/users" && req.method === "POST") {
      const body = await req.json().catch(() => null) as null | { email?: string; name?: string };
      if (!body?.email || !body?.name) {
        return Response.json({ error: "email and name are required" }, { status: 400 });
      }

      const inserted = await db.insert(users).values({
        email: body.email,
        name: body.name,
      }).returning();

      return Response.json(inserted[0], { status: 201 });
    }

    const m = url.pathname.match(/^\/users\/(\d+)$/);
    if (m && req.method === "GET") {
      const id = Number(m[1]);
      const row = await db.select().from(users).where(eq(users.id, id));
      if (row.length === 0) return new Response("Not found", { status: 404 });
      return Response.json(row[0]);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`API running on http://localhost:${port}`);

process.on("SIGINT", async () => {
  await sql.end({ timeout: 5 });
  process.exit(0);
});
