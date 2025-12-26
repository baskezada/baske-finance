import { pgTable, text, timestamp, boolean, uuid, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  oauthProvider: text("oauth_provider"),
  oauthId: text("oauth_id"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true, mode: 'date' }),
  gmailHistoryId: text("gmail_history_id"),
  theme: text("theme").default("light"),
  color: text("color").default("#6366f1"), // indigo-500 default
  background: text("background"),
  trackingMode: text("tracking_mode"), // 'gmail', 'forward', 'manual'
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// Banks table
export const banks = pgTable("banks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bankId: uuid("bank_id").notNull().references(() => banks.id, { onDelete: "cascade" }),
  amount: text("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  exchangeRate: text("exchange_rate"), // Tasa de cambio USD a CLP del día de la transacción
  category: text("category"),
  description: text("description"),
  cardLastFour: text("card_last_four"),
  transactionType: text("transaction_type").notNull().default("cargo"), // "cargo" o "abono"
  rawEmailId: text("raw_email_id").unique(),
  transactionDate: timestamp("transaction_date", { withTimezone: true, mode: 'date' }),
  purchaseSummary: text("purchase_summary"), // Markdown summary from purchase confirmation emails
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const importJobs = pgTable("import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default('pending'), // pending, processing, completed, cancelled, failed
  progress: integer("progress").notNull().default(0),
  totalItems: integer("total_items").notNull().default(0),
  processedItems: integer("processed_items").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const todos = pgTable("todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  completed: boolean("completed").default(false).notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// Relations
export const banksRelations = relations(banks, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  bank: one(banks, {
    fields: [transactions.bankId],
    references: [banks.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));