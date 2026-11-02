ALTER TABLE "projects" ADD COLUMN "delivery_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_delivery_token_idx" ON "projects" USING btree ("delivery_token");--> statement-breakpoint
UPDATE "projects" SET "delivery_token" = replace(gen_random_uuid()::text, '-', '') WHERE "delivery_token" IS NULL;
