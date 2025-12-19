import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db, sql } from "./db";
import { users, todos } from "./schema";
import { eq, desc } from "drizzle-orm";

const app = new Hono();
const port = Number(process.env.PORT) || 3000;

app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

// --- Users ---
app.get("/users", async (c) => {
  const rows = await db.select().from(users).orderBy(users.id);
  return c.json(rows);
});

app.post("/users", async (c) => {
  const body = await c.req.json<{ email: string; name: string }>();
  if (!body.email || !body.name) {
    return c.json({ error: "email and name are required" }, 400);
  }
  const inserted = await db.insert(users).values(body).returning();
  return c.json(inserted[0], 201);
});

// --- Todos ---
app.get("/todos", async (c) => {
  const rows = await db.select().from(todos).orderBy(desc(todos.createdAt));
  return c.json(rows);
});

app.get("/todos/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const rows = await db.select().from(todos).where(eq(todos.id, id));
  if (rows.length === 0) return c.text("Not found", 404);
  return c.json(rows[0]);
});

app.post("/todos", async (c) => {
  const body = await c.req.json<{ title: string }>();
  if (!body.title) return c.json({ error: "Title is required" }, 400);

  const inserted = await db.insert(todos).values({
    title: body.title,
  }).returning();
  return c.json(inserted[0], 201);
});

app.put("/todos/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ title?: string; completed?: boolean }>();

  const existing = await db.select().from(todos).where(eq(todos.id, id));
  if (existing.length === 0) return c.text("Not found", 404);

  // Pick only allowed fields to avoid Drizzle error with extra fields
  const dataToUpdate: Partial<typeof todos.$inferInsert> = {};
  if (body.title !== undefined) dataToUpdate.title = body.title;
  if (body.completed !== undefined) dataToUpdate.completed = body.completed;

  if (Object.keys(dataToUpdate).length === 0) {
    return c.json(existing[0]);
  }

  const updated = await db.update(todos)
    .set(dataToUpdate)
    .where(eq(todos.id, id))
    .returning();

  return c.json(updated[0]);
});

app.delete("/todos/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(todos).where(eq(todos.id, id));
  return c.json({ success: true });
});

console.log(`API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
