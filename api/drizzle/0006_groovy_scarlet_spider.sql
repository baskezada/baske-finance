CREATE TABLE "banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banks_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "bank_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "bank_name";