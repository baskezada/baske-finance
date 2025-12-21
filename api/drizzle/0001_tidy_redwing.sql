ALTER TABLE "users" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_expiry" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gmail_history_id" text;