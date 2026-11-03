ALTER TABLE "projects" ADD COLUMN "staging_invoice_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "staging_unlocked_at" timestamp with time zone;