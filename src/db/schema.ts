import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });
const created = () => ts("created_at").notNull().defaultNow();

/** A brokerage's branding. Agents linked to one inherit its logo and color on property sites. */
export const brokerages = pgTable("brokerages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoKey: text("logo_key"),
  color: text("color").notNull().default("#2b5d4f"),
  website: text("website").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  createdAt: created(),
});

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  brokerage: text("brokerage").notNull().default(""),
  hue: integer("hue").notNull().default(160),
  notes: text("notes"),
  /** Parent brokerage; its logo is used unless the agent uploads their own. */
  brokerageId: text("brokerage_id").references(() => brokerages.id, { onDelete: "set null" }),
  logoKey: text("logo_key"),
  photoKey: text("photo_key"),
  website: text("website").notNull().default(""),
  licenseNo: text("license_no").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
  createdAt: created(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["owner", "client"] }).notNull(),
    clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash"),
    /** Bumped on password change so old sessions stop working. */
    sessionVersion: integer("session_version").notNull().default(1),
    lastLoginAt: ts("last_login_at"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const authTokens = pgTable("auth_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["invite", "reset"] }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: created(),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["photo", "drone", "video", "floorplan", "tour", "twilight"] }).notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  durationMin: integer("duration_min").notNull().default(60),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const packages = pgTable("packages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  serviceIds: text("service_ids").array().notNull().default([]),
  price: integer("price").notNull(),
  popular: boolean("popular").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    address: text("address").notNull(),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    zip: text("zip").notNull().default(""),
    beds: real("beds"),
    baths: real("baths"),
    sqft: integer("sqft"),
    acreage: real("acreage"),
    features: text("features").array().notNull().default([]),
    /** Property website. */
    siteSlug: text("site_slug"),
    siteTemplate: text("site_template", { enum: ["classic", "modern", "minimal"] }).notNull().default("classic"),
    siteHeadline: text("site_headline"),
    mlsDescription: text("mls_description"),
    sitePublished: boolean("site_published").notNull().default(true),
    /** Secret for the stand-alone delivery page at /d/<token>; works without signing in. */
    deliveryToken: text("delivery_token"),
    status: text("status", { enum: ["scheduled", "editing", "delivered", "archived"] }).notNull(),
    shootId: text("shoot_id"),
    invoiceId: text("invoice_id"),
    serviceIds: text("service_ids").array().notNull().default([]),
    /** Local-area stock packs the agent added when booking. */
    stockPackIds: text("stock_pack_ids").array().notNull().default([]),
    coverMediaId: text("cover_media_id"),
    coverSeed: integer("cover_seed").notNull().default(0),
    deliveredAt: ts("delivered_at"),
    createdAt: created(),
  },
  (t) => [index("projects_client_idx").on(t.clientId), uniqueIndex("projects_site_slug_idx").on(t.siteSlug), uniqueIndex("projects_delivery_token_idx").on(t.deliveryToken)],
);

export const shoots = pgTable(
  "shoots",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    start: ts("start").notNull(),
    end: ts("end").notNull(),
    status: text("status", { enum: ["requested", "confirmed", "completed", "cancelled"] }).notNull(),
    photographer: text("photographer").notNull().default(""),
    accessNotes: text("access_notes"),
    calendarEventId: text("calendar_event_id"),
  },
  (t) => [index("shoots_start_idx").on(t.start)],
);

export const media = pgTable(
  "media",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["photo", "video", "floorplan", "tour"] }).notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull().default("application/octet-stream"),
    /** Original file. Empty for tours. */
    storageKey: text("storage_key").notNull().default(""),
    /** ~640px JPEG for grids. */
    thumbKey: text("thumb_key"),
    /** ~1600px JPEG with a watermark, shown before payment. */
    previewKey: text("preview_key"),
    /** ~2048px clean JPEG under 1 MB: the large view after payment and the "MLS" download. */
    webKey: text("web_key"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    durationSec: integer("duration_sec"),
    externalUrl: text("external_url"),
    seed: integer("seed").notNull().default(0),
    sort: integer("sort").notNull().default(0),
    uploadedAt: created(),
  },
  (t) => [index("media_project_idx").on(t.projectId)],
);

export interface InvoiceLineRow {
  description: string;
  quantity: number;
  unitPrice: number;
}

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["draft", "sent", "paid", "overdue", "void"] }).notNull(),
    lines: jsonb("lines").$type<InvoiceLineRow[]>().notNull().default([]),
    taxRate: real("tax_rate").notNull().default(0),
    issuedAt: ts("issued_at").notNull().defaultNow(),
    dueAt: ts("due_at").notNull(),
    paidAt: ts("paid_at"),
    paymentRef: text("payment_ref"),
  },
  (t) => [uniqueIndex("invoices_number_idx").on(t.number)],
);

export const activity = pgTable("activity", {
  id: text("id").primaryKey(),
  at: created(),
  kind: text("kind", { enum: ["booking", "upload", "payment", "download", "client", "delivery"] }).notNull(),
  text: text("text").notNull(),
  projectId: text("project_id"),
  clientId: text("client_id"),
});

/** Key/value store for app-wide settings and integration credentials. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** A service area, matched by ZIP code or city, that can offer stock packs. */
export const zones = pgTable("zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  zips: text("zips").array().notNull().default([]),
  cities: text("cities").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

/** Stock media of local attractions sold as a booking add-on inside a zone. */
export const stockPacks = pgTable("stock_packs", {
  id: text("id").primaryKey(),
  zoneId: text("zone_id")
    .notNull()
    .references(() => zones.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

export const stockMedia = pgTable(
  "stock_media",
  {
    id: text("id").primaryKey(),
    packId: text("pack_id")
      .notNull()
      .references(() => stockPacks.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull().default("image/jpeg"),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key"),
    previewKey: text("preview_key"),
    webKey: text("web_key"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    seed: integer("seed").notNull().default(0),
    uploadedAt: created(),
  },
  (t) => [index("stock_media_pack_idx").on(t.packId)],
);
