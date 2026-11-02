CREATE TABLE "staging_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"media_id" text NOT NULL,
	"invoice_id" text,
	"room_type" text NOT NULL,
	"style" text NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"provider_job_id" text,
	"result_media_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "staged_from_id" text;--> statement-breakpoint
ALTER TABLE "staging_requests" ADD CONSTRAINT "staging_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staging_requests" ADD CONSTRAINT "staging_requests_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staging_project_idx" ON "staging_requests" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "staging_invoice_idx" ON "staging_requests" USING btree ("invoice_id");