CREATE TABLE "stock_media" (
	"id" text PRIMARY KEY NOT NULL,
	"pack_id" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text DEFAULT 'image/jpeg' NOT NULL,
	"storage_key" text NOT NULL,
	"thumb_key" text,
	"preview_key" text,
	"web_key" text,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"seed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"zone_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"zips" text[] DEFAULT '{}' NOT NULL,
	"cities" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stock_pack_ids" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_media" ADD CONSTRAINT "stock_media_pack_id_stock_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."stock_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_packs" ADD CONSTRAINT "stock_packs_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_media_pack_idx" ON "stock_media" USING btree ("pack_id");