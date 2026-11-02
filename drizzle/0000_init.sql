CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"project_id" text,
	"client_id" text
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"brokerage" text DEFAULT '' NOT NULL,
	"hue" integer DEFAULT 160 NOT NULL,
	"notes" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"project_id" text NOT NULL,
	"client_id" text NOT NULL,
	"status" text NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tax_rate" real DEFAULT 0 NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_ref" text
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"kind" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"storage_key" text DEFAULT '' NOT NULL,
	"thumb_key" text,
	"preview_key" text,
	"web_key" text,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"duration_sec" integer,
	"external_url" text,
	"seed" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"service_ids" text[] DEFAULT '{}' NOT NULL,
	"price" integer NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"address" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"zip" text DEFAULT '' NOT NULL,
	"beds" real,
	"baths" real,
	"sqft" integer,
	"status" text NOT NULL,
	"shoot_id" text,
	"invoice_id" text,
	"service_ids" text[] DEFAULT '{}' NOT NULL,
	"cover_media_id" text,
	"cover_seed" integer DEFAULT 0 NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoots" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"client_id" text NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"photographer" text DEFAULT '' NOT NULL,
	"access_notes" text,
	"calendar_event_id" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"client_id" text,
	"password_hash" text,
	"session_version" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoots" ADD CONSTRAINT "shoots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoots" ADD CONSTRAINT "shoots_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_idx" ON "invoices" USING btree ("number");--> statement-breakpoint
CREATE INDEX "media_project_idx" ON "media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_client_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "shoots_start_idx" ON "shoots" USING btree ("start");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");