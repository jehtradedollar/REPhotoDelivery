CREATE TABLE "brokerages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_key" text,
	"color" text DEFAULT '#2b5d4f' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "brokerage_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "logo_key" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "photo_key" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "website" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "license_no" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "acreage" real;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "features" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "site_slug" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "site_template" text DEFAULT 'classic' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "site_headline" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mls_description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "site_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_brokerage_id_brokerages_id_fk" FOREIGN KEY ("brokerage_id") REFERENCES "public"."brokerages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_site_slug_idx" ON "projects" USING btree ("site_slug");