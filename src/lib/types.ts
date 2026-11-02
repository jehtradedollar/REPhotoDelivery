// Domain types, inferred from the database schema so the two never drift.
import type * as s from "@/db/schema";

export type ID = string;
export type Role = "owner" | "client";

export type Client = typeof s.clients.$inferSelect;
export type User = typeof s.users.$inferSelect;
export type Service = typeof s.services.$inferSelect;
export type Package = typeof s.packages.$inferSelect;
export type Project = typeof s.projects.$inferSelect;
export type Shoot = typeof s.shoots.$inferSelect;
export type MediaItem = typeof s.media.$inferSelect;
export type Invoice = typeof s.invoices.$inferSelect;
export type ActivityEvent = typeof s.activity.$inferSelect;
export type InvoiceLine = s.InvoiceLineRow;

export type ServiceKind = Service["kind"];
export type ProjectStatus = Project["status"];
export type MediaKind = MediaItem["kind"];
export type ShootStatus = Shoot["status"];
export type InvoiceStatus = Invoice["status"];

export interface Session {
  userId: string;
  role: Role;
  /** For agents, which client record they belong to. */
  clientId?: string;
  name: string;
  email: string;
}

/** Media as sent to the browser: storage keys swapped for short-lived URLs. */
export interface MediaView {
  id: string;
  kind: MediaKind;
  filename: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  externalUrl: string | null;
  seed: number;
  thumbUrl: string | null;
  /** Large view: watermarked preview before payment, clean web size after. */
  viewUrl: string | null;
  /** Gallery section; "local" is stock media of the area. */
  group?: "local";
  /** Full-quality original; null for embedded links. */
  downloadUrl: string | null;
  /** The 2048px, under-1 MB JPEG for MLS uploads. Photos only. */
  mlsUrl: string | null;
}
