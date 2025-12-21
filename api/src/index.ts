import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./db";
import { todos, transactions, banks } from "./schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { authController, authMiddleware } from "./auth";
import { OAuth2Client } from "google-auth-library";
import { logger } from "./logger";
import { gmailService } from "./gmail-service";
import { excelService } from "./excel-service";
import { aiService } from "./ai-service";

const app = new Hono<{
  Variables: {
    user: any;
  }
}>();
const port = Number(process.env.PORT) || 3000;
const googleAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use("*", cors({
  origin: (origin) => origin, // In production, restrict this to your domain
  credentials: true,
}));

// --- Logging Middleware ---
app.use("*", async (c, next) => {
  const { method, path } = c.req;
  const start = Date.now();

  await next();

  const finish = Date.now();
  const ms = finish - start;
  const status = c.res.status;

  const logData = {
    method,
    path,
    status,
    duration: `${ms}ms`,
  };

  if (status >= 500) {
    logger.error(logData, `Request failed`);
  } else if (status >= 400) {
    logger.warn(logData, `Request warned`);
  } else {
    logger.info(logData, `Request handled`);
  }
});

app.get("/health", (c) => c.json({ ok: true }));

// --- Auth Routes ---
app.post("/auth/register", (c) => authController.register(c));
app.post("/auth/login", (c) => authController.login(c));
app.get("/auth/me", (c) => authController.me(c));
app.post("/auth/logout", (c) => authController.logout(c));
app.get("/auth/:provider/login", (c) => authController.oauthLogin(c));
app.get("/auth/:provider/callback", (c) => authController.oauthCallback(c));

app.post("/auth/gmail/import", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const { month, year } = await c.req.json<{ month: number; year: number }>();

  if (!month || !year) {
    return c.json({ error: "Month and year are required" }, 400);
  }

  // Calculate start and end date for the month
  const startDate = `${year}/${month}/01`;
  const endDate = month === 12 ? `${year + 1}/01/01` : `${year}/${month + 1}/01`;

  try {
    const result = await gmailService.importHistory(user.id, startDate, endDate);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err, userId: user.id }, "Historical import failed");
    return c.json({ error: err.message || "Failed to import history" }, 500);
  }
});

app.get("/auth/gmail/import/status/:id", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const id = c.req.param("id");
  const job = await gmailService.getJobStatus(user.id, id);
  if (!job) return c.json({ error: "Job not found" }, 404);
  return c.json(job);
});

app.post("/auth/gmail/import/cancel/:id", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const id = c.req.param("id");
  await gmailService.cancelJob(user.id, id);
  return c.json({ success: true });
});

// Bank endpoints
app.get("/banks", authMiddleware, async (c) => {
  try {
    const allBanks = await db.select().from(banks).orderBy(banks.name);
    return c.json(allBanks);
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch banks");
    return c.json({ error: "Failed to fetch banks" }, 500);
  }
});

app.post("/banks", authMiddleware, async (c) => {
  try {
    const { name } = await c.req.json<{ name: string }>();

    if (!name) {
      return c.json({ error: "Bank name is required" }, 400);
    }

    const [newBank] = await db.insert(banks).values({ name }).returning();
    return c.json(newBank);
  } catch (err: any) {
    logger.error({ err }, "Failed to create bank");
    return c.json({ error: "Failed to create bank" }, 500);
  }
});

app.post("/transactions/import-excel", authMiddleware, async (c) => {
  const user = c.get("user") as any;

  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const bankId = body.bankId as string;

    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    if (!bankId) {
      return c.json({ error: "Bank is required" }, 400);
    }

    // Verify bank exists
    const [bank] = await db.select().from(banks).where(eq(banks.id, bankId));
    if (!bank) {
      return c.json({ error: "Invalid bank" }, 400);
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File size exceeds 5MB limit" }, 400);
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse Excel to JSON
    const excelData = excelService.parseAnyExcelToString(buffer);

    /*    if (excelData.length === 0) {
         return c.json({ error: "No data found in Excel file" }, 400);
       } */

    /*     // Convert to readable string for AI
        const excelDataString = excelService.jsonToReadableString(excelData); */
    logger.info({ excelData }, "Excel data string");
    // Parse with AI
    const parsedTransactions = await aiService.parseExcelTransactions(excelData);
    if (parsedTransactions.length === 0) {
      return c.json({ error: "No transactions could be extracted from the file" }, 400);
    }

    // Return parsed transactions for preview
    return c.json({
      success: true,
      transactions: parsedTransactions,
      count: parsedTransactions.length
    });
  } catch (err: any) {
    logger.error({ err, userId: user.id }, "Excel import failed");
    return c.json({ error: err.message || "Failed to import Excel" }, 500);
  }
});

app.post("/transactions/import-excel/confirm", authMiddleware, async (c) => {
  const user = c.get("user") as any;

  try {
    const { transactions: parsedTransactions, bankId } = await c.req.json<{
      transactions: any[],
      bankId: string
    }>();

    if (!parsedTransactions || parsedTransactions.length === 0) {
      return c.json({ error: "No transactions to import" }, 400);
    }

    if (!bankId) {
      return c.json({ error: "Bank ID is required" }, 400);
    }

    // Verify bank exists
    const [bank] = await db.select().from(banks).where(eq(banks.id, bankId));
    if (!bank) {
      return c.json({ error: "Invalid bank" }, 400);
    }

    // Insert all transactions
    const values = parsedTransactions.map(t => ({
      userId: user.id,
      bankId: bankId,
      amount: t.amount?.toString() || "0",
      currency: t.currency || "ARS",
      category: t.category,
      description: t.description,
      cardLastFour: t.cardLastFour,
      transactionDate: t.transactionDate ? new Date(t.transactionDate) : null,
      transactionType: t.transactionType || "cargo",
    }));

    await db.insert(transactions).values(values);

    return c.json({ success: true, imported: values.length });
  } catch (err: any) {
    logger.error({ err, userId: user.id }, "Failed to confirm Excel import");
    return c.json({ error: err.message || "Failed to save transactions" }, 500);
  }
});

app.get("/transactions", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const { startDate, endDate, category, bankId } = c.req.query();

  try {
    const conditions = [eq(transactions.userId, user.id)];

    if (startDate) {
      conditions.push(sql`${transactions.transactionDate} >= ${new Date(startDate)}`);
    }
    if (endDate) {
      conditions.push(sql`${transactions.transactionDate} <= ${new Date(endDate)}`);
    }
    if (category) {
      conditions.push(eq(transactions.category, category));
    }
    if (bankId) {
      conditions.push(eq(transactions.bankId, bankId));
    }

    const userTransactions = await db.select({
      id: transactions.id,
      userId: transactions.userId,
      bankId: transactions.bankId,
      bankName: banks.name,
      amount: transactions.amount,
      currency: transactions.currency,
      category: transactions.category,
      description: transactions.description,
      cardLastFour: transactions.cardLastFour,
      transactionType: transactions.transactionType,
      rawEmailId: transactions.rawEmailId,
      transactionDate: transactions.transactionDate,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
      .from(transactions)
      .leftJoin(banks, eq(transactions.bankId, banks.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.transactionDate));

    return c.json(userTransactions);
  } catch (err: any) {
    logger.error({ err, userId: user.id }, "Failed to fetch transactions");
    return c.json({ error: "Failed to fetch transactions" }, 500);
  }
});

app.put("/transactions/:id", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const id = c.req.param("id");
  const body = await c.req.json();

  try {
    const [updated] = await db.update(transactions)
      .set({
        bankId: body.bankId,
        amount: body.amount,
        currency: body.currency,
        category: body.category,
        description: body.description,
        cardLastFour: body.cardLastFour,
        transactionDate: body.transactionDate ? new Date(body.transactionDate) : null,
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .returning();

    if (!updated) return c.json({ error: "Transaction not found" }, 404);
    return c.json(updated);
  } catch (err: any) {
    logger.error({ err, userId: user.id, transactionId: id }, "Failed to update transaction");
    return c.json({ error: "Failed to update transaction" }, 500);
  }
});

app.delete("/transactions/:id", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const id = c.req.param("id");

  try {
    const [deleted] = await db.delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .returning();

    if (!deleted) return c.json({ error: "Transaction not found" }, 404);
    return c.json({ success: true });
  } catch (err: any) {
    logger.error({ err, userId: user.id, transactionId: id }, "Failed to delete transaction");
    return c.json({ error: "Failed to delete transaction" }, 500);
  }
});

// --- Webhooks ---
app.post("/webhooks/gmail", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Received Gmail webhook without valid Authorization header");
    return c.text("Unauthorized", 401);
  }

  const idToken = authHeader.split(" ")[1];

  try {
    // Verify that the call is genuinely from Google Pub/Sub
    // The audience should match the URL you configured in the Push subscription
    // Or you can leave audience check if you trust Google's certs and other checks
    await googleAuthClient.verifyIdToken({
      idToken,
      audience: process.env.WEBHOOK_AUDIENCE || undefined,
    });
  } catch (err) {
    logger.error({ err }, "Failed to verify Pub/Sub ID token");
    return c.text("Unauthorized", 401);
  }

  const body = await c.req.json();
  logger.info({ body }, "Received authenticated Gmail webhook notification");

  if (body.message?.data) {
    try {
      const decodedString = Buffer.from(body.message.data, "base64").toString();
      const decoded = JSON.parse(decodedString);
      await gmailService.processNotification(decoded);
    } catch (err) {
      logger.error({ err }, "Failed to process Gmail webhook data");
    }
  }

  return c.json({ success: true });
});

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

logger.info({ port }, `BFF API running`);

serve({
  fetch: app.fetch,
  port
});
