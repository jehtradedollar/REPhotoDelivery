import "server-only";
import { buildSeed } from "./mock-data";
import type { Client, Invoice, MediaItem, Project, Shoot } from "./types";

// In-memory store. Survives hot reloads in dev, resets on server restart.
// Replace this file's internals with a real database (Postgres + Prisma/Drizzle)
// later; keep the exported function signatures so pages don't change.
type Store = ReturnType<typeof buildSeed>;
const g = globalThis as unknown as { __rpdStore?: Store };
export const db: Store = (g.__rpdStore ??= buildSeed());

export const getClients = () => [...db.clients].sort((a, b) => a.name.localeCompare(b.name));
export const getClient = (id: string) => db.clients.find((c) => c.id === id);

export const getProjects = (filter?: { clientId?: string }) =>
  db.projects
    .filter((p) => !filter?.clientId || p.clientId === filter.clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const getProject = (id: string) => db.projects.find((p) => p.id === id);

export const getShoots = (filter?: { clientId?: string }) =>
  db.shoots
    .filter((s) => !filter?.clientId || s.clientId === filter.clientId)
    .sort((a, b) => a.start.localeCompare(b.start));
export const getShoot = (id?: string) => (id ? db.shoots.find((s) => s.id === id) : undefined);

export const getInvoices = (filter?: { clientId?: string }) =>
  db.invoices
    .filter((i) => !filter?.clientId || i.clientId === filter.clientId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
export const getInvoice = (id?: string) => (id ? db.invoices.find((i) => i.id === id) : undefined);

export const getMedia = (projectId: string): MediaItem[] => db.media.filter((m) => m.projectId === projectId);

export const getServices = () => db.services;
export const getPackages = () => db.packages;
export const getActivity = () => [...db.activity].sort((a, b) => b.at.localeCompare(a.at));

export function invoiceTotal(inv: Invoice) {
  const subtotal = inv.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const tax = Math.round(subtotal * inv.taxRate);
  return { subtotal, tax, total: subtotal + tax };
}

/** Downloads unlock once the project's invoice is paid (or there is no invoice). */
export function isUnlocked(project: Project) {
  const inv = getInvoice(project.invoiceId);
  return !inv || inv.status === "paid";
}

export interface ProjectRow {
  project: Project;
  client?: Client;
  shoot?: Shoot;
  invoice?: Invoice;
  mediaCount: number;
}

export function projectRows(filter?: { clientId?: string }): ProjectRow[] {
  return getProjects(filter).map((project) => ({
    project,
    client: getClient(project.clientId),
    shoot: getShoot(project.shootId),
    invoice: getInvoice(project.invoiceId),
    mediaCount: db.media.filter((m) => m.projectId === project.id).length,
  }));
}

let counter = 1000;
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;
