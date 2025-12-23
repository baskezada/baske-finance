import { google } from "googleapis";
import crypto from "crypto";
import { db } from "./db";
import { users, transactions, importJobs, banks } from "./schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { logger } from "./logger";
import { aiService } from "./ai-service";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const PUB_SUB_TOPIC = process.env.PUB_SUB_TOPIC || "projects/baske-finance/topics/gmail-notifications";

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

export const gmailService = {
    async matchPurchaseToTransaction(
        userId: string,
        purchaseAmount: number,
        purchaseDate: Date,
        purchaseSummary: string
    ) {
        // Calculate time window: ±1 day from purchase date
        const oneDayInMs = 24 * 60 * 60 * 1000;
        const startWindow = new Date(purchaseDate.getTime() - oneDayInMs);
        const endWindow = new Date(purchaseDate.getTime() + oneDayInMs);

        logger.info(
            {
                userId,
                purchaseAmount,
                purchaseDate,
                startWindow,
                endWindow,
            },
            "Searching for matching transaction in time window"
        );

        // Find transactions within the time window with matching amount
        const matchingTransactions = await db
            .select()
            .from(transactions)
            .where(
                and(
                    eq(transactions.userId, userId),
                    gte(transactions.transactionDate, startWindow),
                    lte(transactions.transactionDate, endWindow),
                    sql`CAST(${transactions.amount} AS DECIMAL) = ${purchaseAmount}`
                )
            );

        if (matchingTransactions.length > 0) {
            logger.info(
                {
                    userId,
                    matchCount: matchingTransactions.length,
                    transactionIds: matchingTransactions.map(t => t.id),
                },
                "Found matching transaction(s) for purchase"
            );

            // Update the first matching transaction with the purchase summary
            const matchedTransaction = matchingTransactions[0];
            await db
                .update(transactions)
                .set({
                    purchaseSummary,
                    updatedAt: new Date(),
                })
                .where(eq(transactions.id, matchedTransaction.id));

            logger.info(
                {
                    userId,
                    transactionId: matchedTransaction.id,
                },
                "Updated transaction with purchase summary"
            );

            return matchedTransaction;
        }

        logger.info(
            { userId, purchaseAmount, purchaseDate },
            "No matching transaction found for purchase"
        );

        return null;
    },

    async setupWatch(userId: string) {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user || !user.refreshToken) {
            logger.error({ userId }, "User not found or no refresh token for Gmail watch");
            return;
        }

        oauth2Client.setCredentials({
            refresh_token: user.refreshToken,
            access_token: user.accessToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        try {
            const res = await gmail.users.watch({
                userId: "me",
                requestBody: {
                    topicName: PUB_SUB_TOPIC,
                    labelIds: ["INBOX"],
                },
            });

            logger.info({ userId, data: res.data }, "Gmail watch established");

            if (res.data.historyId) {
                await db.update(users).set({
                    gmailHistoryId: res.data.historyId,
                }).where(eq(users.id, userId));
            }
        } catch (error) {
            logger.error({ userId, error }, "Error setting up Gmail watch");
        }
    },

    async processNotification(data: { emailAddress: string, historyId: string }) {
        logger.info({ data }, "Processing Gmail notification");

        const [user] = await db.select().from(users).where(eq(users.email, data.emailAddress));
        if (!user || !user.refreshToken) {
            logger.warn({ email: data.emailAddress }, "User not found for notification");
            return;
        }

        oauth2Client.setCredentials({
            refresh_token: user.refreshToken,
            access_token: user.accessToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        try {
            const history = await gmail.users.history.list({
                userId: "me",
                startHistoryId: user.gmailHistoryId || data.historyId,
            });

            if (history.data.history) {
                for (const h of history.data.history) {
                    if (h.messagesAdded) {
                        for (const msgAdded of h.messagesAdded) {
                            if (msgAdded.message?.id) {
                                await this.fetchAndProcessMessage(user, msgAdded.message.id);
                            }
                        }
                    }
                }
            }

            // Update history ID to avoid re-processing
            await db.update(users).set({
                gmailHistoryId: data.historyId,
            }).where(eq(users.id, user.id));

        } catch (error) {
            logger.error({ userId: user.id, error }, "Error processing history flow");
        }
    },

    async fetchAndProcessMessage(user: typeof users.$inferSelect, messageId: string) {
        logger.info({ userId: user.id, messageId }, "New email detected! Fetching details...");

        oauth2Client.setCredentials({
            refresh_token: user.refreshToken,
            access_token: user.accessToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        try {
            const msg = await gmail.users.messages.get({
                userId: "me",
                id: messageId,
                format: "full"
            });

            const subject = msg.data.payload?.headers?.find(h => h.name === "Subject")?.value || "";
            const from = msg.data.payload?.headers?.find(h => h.name === "From")?.value || "";

            // Extract body (prefer plain text)
            let body = msg.data.snippet || "";
            const part = msg.data.payload?.parts?.find(p => p.mimeType === "text/plain");
            if (part?.body?.data) {
                body = Buffer.from(part.body.data, "base64").toString();
            }

            // First, classify the email
            const classification = await this.classifyEmail(subject, from);

            if (classification === "BANK_TRANSACTION") {
                logger.info({ userId: user.id, messageId, subject }, "Email classified as BANK_TRANSACTION");

                const parsed = await aiService.parseEmailTransaction(subject, from, body);

                if (parsed) {
                    logger.info({ userId: user.id, messageId, parsed }, "Transaction parsed! Saving to database...");

                    logger.warn({ userId: user.id, messageId, bankId: parsed.bankId }, "Gmail import temporarily disabled - need bank validation");

                    await db.insert(transactions).values({
                        userId: user.id,
                        bankId: parsed.bankId,
                        amount: parsed.amount?.toString() || "0",
                        currency: parsed.currency || "USD",
                        category: parsed.category,
                        description: parsed.description,
                        cardLastFour: parsed.cardLastFour,
                        transactionDate: parsed.transactionDate ? new Date(parsed.transactionDate) : null,
                        transactionType: parsed.transactionType || "cargo",
                        rawEmailId: messageId,
                    }).onConflictDoNothing();

                    logger.info({ userId: user.id, messageId }, "Transaction processed (Gmail import disabled)");
                } else {
                    logger.info({ userId: user.id, messageId }, "Email is not a bank transaction, skipping.");
                }
            } else if (classification === "PURCHASE_INFORMATION") {
                logger.info({ userId: user.id, messageId, subject }, "Email classified as PURCHASE_INFORMATION");

                const purchaseInfo = await aiService.parsePurchaseInformation(subject, from, body);

                if (purchaseInfo && purchaseInfo.amount && purchaseInfo.purchaseDate && purchaseInfo.summary) {
                    logger.info(
                        { userId: user.id, messageId, purchaseInfo },
                        "Purchase information parsed! Searching for matching transaction..."
                    );

                    await this.matchPurchaseToTransaction(
                        user.id,
                        purchaseInfo.amount,
                        new Date(purchaseInfo.purchaseDate),
                        purchaseInfo.summary
                    );
                } else {
                    logger.info({ userId: user.id, messageId }, "Could not extract complete purchase information.");
                }
            } else {
                logger.info({ userId: user.id, messageId, subject, classification }, "Email discarded by classification.");
            }
        } catch (error) {
            logger.error({ userId: user.id, messageId, error }, "Error processing email structure");
        }
    },

    async classifyEmail(subject: string, from: string): Promise<string> {
        if (!process.env.GEMINI_API_KEY) return "OTHER";

        const prompt = `

            Classify the following email header (subject and sender) into one of three categories:

            "BANK_TRANSACTION", "PURCHASE_INFORMATION", "OTHER".

            Respond only with one of the exact phrases: "BANK_TRANSACTION", "PURCHASE_INFORMATION", "OTHER".

            Subject: ${subject}
            From: ${from}
        `;

        try {
            const genAI = new (await import("@google/generative-ai")).GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim().toUpperCase();

            logger.info(
                { subject, from, classification: text },
                "Email classification result"
            );

            return text.includes("BANK_TRANSACTION") ? "BANK_TRANSACTION"
                : text.includes("PURCHASE_INFORMATION") ? "PURCHASE_INFORMATION"
                : "OTHER";
        } catch (error) {
            logger.error({ error }, "Error in email classification");
            return "OTHER";
        }
    },

    async importHistory(userId: string, startDate: string, endDate: string) {
        // This is now a wrapper that starts a job
        const jobId = crypto.randomUUID();
        await db.insert(importJobs).values({
            id: jobId,
            userId,
            status: "pending",
            progress: 0,
        });

        // Start processing in background
        this.runImportJob(jobId, userId, startDate, endDate).catch(err => {
            logger.error({ jobId, err }, "Background job failed unexpectedly");
        });

        return { jobId };
    },

    async runImportJob(jobId: string, userId: string, startDate: string, endDate: string) {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user || !user.refreshToken) {
            await db.update(importJobs).set({ status: "failed", error: "User not found or no refresh token" }).where(eq(importJobs.id, jobId));
            return;
        }

        await db.update(importJobs).set({ status: "processing" }).where(eq(importJobs.id, jobId));

        oauth2Client.setCredentials({
            refresh_token: user.refreshToken,
            access_token: user.accessToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        const query = `after:${startDate} before:${endDate}`;

        try {
            const listRes = await gmail.users.messages.list({
                userId: "me",
                q: query,
            });

            if (!listRes.data.messages) {
                await db.update(importJobs).set({ status: "completed", progress: 100, totalItems: 0 }).where(eq(importJobs.id, jobId));
                return;
            }

            const total = listRes.data.messages.length;
            await db.update(importJobs).set({ totalItems: total }).where(eq(importJobs.id, jobId));

            let processed = 0;
            let cancelled = false;
            const BATCH_SIZE = 5; // Process 5 emails in parallel
            const UPDATE_INTERVAL = 10; // Update progress every 10 emails

            // Process in batches for parallel execution
            for (let i = 0; i < listRes.data.messages.length; i += BATCH_SIZE) {
                // Check for cancellation every batch
                if (i % (BATCH_SIZE * 2) === 0) {
                    const [currentJob] = await db.select().from(importJobs).where(eq(importJobs.id, jobId));
                    if (currentJob.status === "cancelled") {
                        logger.info({ jobId }, "Job cancelled by user");
                        cancelled = true;
                        break;
                    }
                }

                const batch = listRes.data.messages.slice(i, i + BATCH_SIZE);

                // Process batch in parallel
                await Promise.all(
                    batch.map(async (msg) => {
                        if (msg.id && !cancelled) {
                            try {
                                await this.fetchAndProcessMessage(user, msg.id);
                            } catch (error) {
                                logger.error({ jobId, messageId: msg.id, error }, "Error processing message in batch");
                            }
                        }
                    })
                );

                processed += batch.length;

                // Update progress periodically, not on every email
                if (processed % UPDATE_INTERVAL === 0 || processed === total) {
                    const progress = Math.round((processed / total) * 100);
                    await db.update(importJobs).set({
                        processedItems: processed,
                        progress,
                        updatedAt: new Date()
                    }).where(eq(importJobs.id, jobId));
                }
            }

            if (cancelled) {
                return;
            }

            await db.update(importJobs).set({ status: "completed", progress: 100 }).where(eq(importJobs.id, jobId));

        } catch (error) {
            logger.error({ userId, jobId, error }, "Error in background job worker");
            await db.update(importJobs).set({
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error"
            }).where(eq(importJobs.id, jobId));
        }
    },

    async getJobStatus(userId: string, jobId: string) {
        const [job] = await db.select().from(importJobs).where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)));
        return job;
    },

    async cancelJob(userId: string, jobId: string) {
        await db.update(importJobs).set({ status: "cancelled" }).where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)));
    }
};
