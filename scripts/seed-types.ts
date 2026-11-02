// Shapes used only by the demo seed data (scripts/seed.ts).
// These types are what the UI renders. When a real database is added, keep
// these shapes and swap the implementation in `src/lib/data.ts`.

export type ID = string;

export type Role = "owner" | "client";

export interface Client {
  id: ID;
  name: string;
  email: string;
  phone: string;
  brokerage: string;
  /** Initials-avatar background hue (0-360). */
  hue: number;
  createdAt: string; // ISO
  notes?: string;
}

export type ServiceKind = "photo" | "drone" | "video" | "floorplan" | "tour" | "twilight";

export interface Service {
  id: ID;
  name: string;
  kind: ServiceKind;
  description: string;
  price: number; // cents
  durationMin: number;
}

export interface Package {
  id: ID;
  name: string;
  description: string;
  serviceIds: ID[];
  price: number; // cents
  popular?: boolean;
}

export type ProjectStatus =
  | "scheduled" // shoot booked, not yet shot
  | "editing" // shot, media being edited
  | "delivered" // media uploaded and shared, may be awaiting payment
  | "archived";

export interface Project {
  id: ID;
  clientId: ID;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  status: ProjectStatus;
  shootId?: ID;
  invoiceId?: ID;
  serviceIds: ID[];
  createdAt: string;
  deliveredAt?: string;
  /** Cover image seed used by the placeholder renderer. */
  coverSeed: number;
}

export type MediaKind = "photo" | "video" | "floorplan" | "tour";

export interface MediaItem {
  id: ID;
  projectId: ID;
  kind: MediaKind;
  filename: string;
  /** Storage object key, e.g. projects/<id>/<filename>. Resolved to a URL by the storage provider. */
  storageKey: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  /** For tours: external URL (Matterport etc). */
  externalUrl?: string;
  seed: number;
  uploadedAt: string;
}

export type ShootStatus = "requested" | "confirmed" | "completed" | "cancelled";

export interface Shoot {
  id: ID;
  projectId: ID;
  clientId: ID;
  start: string; // ISO
  end: string; // ISO
  status: ShootStatus;
  photographer: string;
  accessNotes?: string;
  /** Google Calendar event id once synced. */
  calendarEventId?: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number; // cents
}

export interface Invoice {
  id: ID;
  number: string;
  projectId: ID;
  clientId: ID;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  taxRate: number; // 0.0725 = 7.25%
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  /** Stripe checkout session / payment intent id once paid. */
  paymentRef?: string;
}

export interface ActivityEvent {
  id: ID;
  at: string;
  kind: "booking" | "upload" | "payment" | "download" | "client" | "delivery";
  text: string;
  projectId?: ID;
  clientId?: ID;
}

export interface Session {
  role: Role;
  /** For clients, which client record they are. */
  clientId?: ID;
  name: string;
  email: string;
}
