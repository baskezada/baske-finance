import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./db";
import { todos } from "./schema";
import { eq, desc, and } from "drizzle-orm";
import { authController, authMiddleware } from "./auth";

const app = new Hono<{
  Variables: {
    user: any;
  }
}>();
const port = Number(process.env.PORT) || 3000;

app.use("*", cors({
  origin: (origin) => origin, // In production, restrict this to your domain
  credentials: true,
}));

app.get("/health", (c) => c.json({ ok: true }));

// --- Auth Routes ---
app.post("/auth/register", (c) => authController.register(c));
app.post("/auth/login", (c) => authController.login(c));
app.get("/auth/me", (c) => authController.me(c));
app.post("/auth/logout", (c) => authController.logout(c));
app.get("/auth/:provider/login", (c) => authController.oauthLogin(c));
app.get("/auth/:provider/callback", (c) => authController.oauthCallback(c));

// --- Todos (Protected) ---
app.use("/todos/*", authMiddleware);

app.get("/todos", async (c) => {
  const user = c.get("user") as any;
  const rows = await db.select().from(todos)
    .where(eq(todos.userId, user.id))
    .orderBy(desc(todos.createdAt));
  return c.json(rows);
});

app.get("/todos/:id", async (c) => {
  const user = c.get("user") as any;
  const id = c.req.param("id");
  const rows = await db.select().from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)));
  if (rows.length === 0) return c.text("Not found", 404);
  return c.json(rows[0]);
});

app.post("/todos", async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json<{ title: string }>();
  if (!body.title) return c.json({ error: "Title is required" }, 400);

  const inserted = await db.insert(todos).values({
    title: body.title,
    userId: user.id,
  }).returning();
  return c.json(inserted[0], 201);
});

app.put("/todos/:id", async (c) => {
  const user = c.get("user") as any;
  const id = c.req.param("id");
  const body = await c.req.json<{ title?: string; completed?: boolean }>();

  const existing = await db.select().from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)));
  if (existing.length === 0) return c.text("Not found", 404);

  const dataToUpdate: Partial<typeof todos.$inferInsert> = {};
  if (body.title !== undefined) dataToUpdate.title = body.title;
  if (body.completed !== undefined) dataToUpdate.completed = body.completed;

  if (Object.keys(dataToUpdate).length === 0) {
    return c.json(existing[0]);
  }

  const updated = await db.update(todos)
    .set(dataToUpdate)
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
    .returning();

  return c.json(updated[0]);
});

app.delete("/todos/:id", async (c) => {
  const user = c.get("user") as any;
  const id = c.req.param("id");
  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, user.id)));
  return c.json({ success: true });
});

console.log(`BFF API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
