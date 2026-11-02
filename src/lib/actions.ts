"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, requireClient, requireOwner, SESSION_COOKIE } from "./auth";
import { db, getClient, getInvoice, getProject, invoiceTotal, newId } from "./data";
import { fullAddress, money } from "./format";
import { calendar, payments, storage } from "./integrations";
import type { MediaKind, Project, ProjectStatus } from "./types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = Number(fd.get(k));
  return Number.isFinite(v) && v > 0 ? v : undefined;
};

function log(kind: (typeof db.activity)[number]["kind"], text: string, ids: { projectId?: string; clientId?: string } = {}) {
  db.activity.push({ id: newId("act"), at: new Date().toISOString(), kind, text, ...ids });
}

/* ---------- Auth (demo) ---------- */

async function setSession(value: { role: "owner" } | { role: "client"; clientId: string }) {
  (await cookies()).set(SESSION_COOKIE, JSON.stringify(value), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
}

export async function signIn(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const next = str(fd, "next");
  const client = db.clients.find((c) => c.email.toLowerCase() === email);
  if (client) {
    await setSession({ role: "client", clientId: client.id });
    redirect(next.startsWith("/portal") ? next : "/portal");
  }
  await setSession({ role: "owner" });
  redirect(next.startsWith("/studio") ? next : "/studio");
}

export async function signInDemo(fd: FormData) {
  const as = str(fd, "as");
  if (as === "owner") {
    await setSession({ role: "owner" });
    redirect("/studio");
  }
  await setSession({ role: "client", clientId: as || "cli_maya" });
  redirect("/portal");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/* ---------- Owner: clients ---------- */

export async function createClient(fd: FormData) {
  await requireOwner();
  const name = str(fd, "name");
  const email = str(fd, "email");
  if (!name || !email) redirect("/studio/clients/new?error=missing");
  const id = newId("cli");
  db.clients.push({
    id,
    name,
    email,
    phone: str(fd, "phone"),
    brokerage: str(fd, "brokerage"),
    notes: str(fd, "notes") || undefined,
    hue: Math.floor(Math.random() * 360),
    createdAt: new Date().toISOString(),
  });
  log("client", `${name} was added as a client`, { clientId: id });
  // TODO: send portal invite email.
  revalidatePath("/studio", "layout");
  redirect(`/studio/clients/${id}?created=1`);
}

/* ---------- Shared: create project + shoot ---------- */

async function createProjectWithShoot(input: {
  clientId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  serviceIds: string[];
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  notes?: string;
  confirmed: boolean;
}) {
  const projectId = newId("prj");
  const shootId = newId("sht");
  const start = new Date(`${input.date}T${input.time || "10:00"}:00`);
  const minutes = Math.max(
    60,
    input.serviceIds.reduce((s, id) => s + (db.services.find((x) => x.id === id)?.durationMin ?? 0), 0),
  );
  const end = new Date(start.getTime() + minutes * 60_000);
  const project: Project = {
    id: projectId,
    clientId: input.clientId,
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    beds: input.beds,
    baths: input.baths,
    sqft: input.sqft,
    status: "scheduled",
    shootId,
    serviceIds: input.serviceIds,
    createdAt: new Date().toISOString(),
    coverSeed: Math.floor(Math.random() * 1000),
  };
  let calendarEventId: string | undefined;
  if (input.confirmed) {
    const client = getClient(input.clientId);
    ({ eventId: calendarEventId } = await calendar.createEvent({
      title: `Shoot: ${input.address}`,
      location: fullAddress(project),
      start: start.toISOString(),
      end: end.toISOString(),
      description: input.notes,
      attendeeEmails: client ? [client.email] : [],
    }));
  }
  db.projects.push(project);
  db.shoots.push({
    id: shootId,
    projectId,
    clientId: input.clientId,
    start: start.toISOString(),
    end: end.toISOString(),
    status: input.confirmed ? "confirmed" : "requested",
    photographer: "Jonathan",
    accessNotes: input.notes,
    calendarEventId,
  });
  return project;
}

function projectInput(fd: FormData) {
  return {
    address: str(fd, "address"),
    city: str(fd, "city"),
    state: str(fd, "state") || "CA",
    zip: str(fd, "zip"),
    beds: num(fd, "beds"),
    baths: num(fd, "baths"),
    sqft: num(fd, "sqft"),
    serviceIds: fd.getAll("services").map(String),
    date: str(fd, "date"),
    time: str(fd, "time"),
    notes: str(fd, "notes") || undefined,
  };
}

function servicesFromPackage(fd: FormData) {
  const pkg = db.packages.find((p) => p.id === str(fd, "package"));
  const extra = fd.getAll("services").map(String);
  return Array.from(new Set([...(pkg?.serviceIds ?? []), ...extra]));
}

export async function createProject(fd: FormData) {
  await requireOwner();
  const input = projectInput(fd);
  const clientId = str(fd, "clientId");
  if (!clientId || !input.address || !input.date) redirect("/studio/projects/new?error=missing");
  const project = await createProjectWithShoot({ ...input, clientId, serviceIds: servicesFromPackage(fd), confirmed: true });
  log("booking", `Scheduled a shoot at ${project.address}`, { projectId: project.id, clientId });
  revalidatePath("/studio", "layout");
  redirect(`/studio/projects/${project.id}`);
}

/* ---------- Owner: project workflow ---------- */

export async function setProjectStatus(projectId: string, status: ProjectStatus) {
  await requireOwner();
  const p = getProject(projectId);
  if (!p) return;
  p.status = status;
  revalidatePath("/studio", "layout");
}

export async function confirmShoot(shootId: string) {
  await requireOwner();
  const s = db.shoots.find((x) => x.id === shootId);
  if (!s) return;
  const p = getProject(s.projectId);
  s.status = "confirmed";
  if (!s.calendarEventId && p) {
    s.calendarEventId = (await calendar.createEvent({ title: `Shoot: ${p.address}`, location: fullAddress(p), start: s.start, end: s.end })).eventId;
  }
  revalidatePath("/studio", "layout");
}

export async function completeShoot(shootId: string) {
  await requireOwner();
  const s = db.shoots.find((x) => x.id === shootId);
  if (!s) return;
  s.status = "completed";
  const p = getProject(s.projectId);
  if (p && p.status === "scheduled") p.status = "editing";
  revalidatePath("/studio", "layout");
}

/** Records uploaded files. In production the browser PUTs to storage.createUploadTarget() first. */
export async function addMedia(projectId: string, files: { name: string; size: number; type: string }[]) {
  await requireOwner();
  const p = getProject(projectId);
  if (!p) return;
  for (const f of files) {
    const target = await storage.createUploadTarget({ projectId, filename: f.name, contentType: f.type });
    const kind: MediaKind = f.type.startsWith("video/") ? "video" : f.type === "application/pdf" ? "floorplan" : "photo";
    db.media.push({
      id: newId("med"),
      projectId,
      kind,
      filename: f.name,
      storageKey: target.key,
      sizeBytes: f.size,
      seed: Math.floor(Math.random() * 5000),
      uploadedAt: new Date().toISOString(),
    });
  }
  if (p.status === "scheduled") p.status = "editing";
  revalidatePath(`/studio/projects/${projectId}`);
}

export async function removeMedia(mediaId: string) {
  await requireOwner();
  const i = db.media.findIndex((m) => m.id === mediaId);
  if (i < 0) return;
  const [m] = db.media.splice(i, 1);
  await storage.deleteObject(m.storageKey);
  revalidatePath(`/studio/projects/${m.projectId}`);
}

/** Marks the project delivered, issues the invoice, and (later) emails the agent. */
export async function deliverProject(projectId: string) {
  await requireOwner();
  const p = getProject(projectId);
  if (!p) return;
  p.status = "delivered";
  p.deliveredAt = new Date().toISOString();
  let inv = getInvoice(p.invoiceId);
  if (!inv) {
    const id = newId("inv");
    const now = new Date();
    db.invoices.push({
      id,
      number: `INV-${1041 + db.invoices.length}`,
      projectId: p.id,
      clientId: p.clientId,
      status: "sent",
      lines: p.serviceIds.map((sid) => {
        const s = db.services.find((x) => x.id === sid)!;
        return { description: s.name, quantity: 1, unitPrice: s.price };
      }),
      taxRate: 0,
      issuedAt: now.toISOString(),
      dueAt: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
    });
    p.invoiceId = id;
    inv = getInvoice(id);
  } else if (inv.status === "draft") {
    inv.status = "sent";
    inv.issuedAt = new Date().toISOString();
  }
  const count = db.media.filter((m) => m.projectId === p.id).length;
  log("delivery", `Delivered ${count} files for ${p.address}`, { projectId: p.id, clientId: p.clientId });
  // TODO: email the agent a link to /portal/properties/<id>.
  revalidatePath("/studio", "layout");
}

export async function markInvoicePaidManually(invoiceId: string) {
  await requireOwner();
  const inv = getInvoice(invoiceId);
  if (!inv) return;
  inv.status = "paid";
  inv.paidAt = new Date().toISOString();
  inv.paymentRef = "manual";
  log("payment", `Marked ${inv.number} paid (${money(invoiceTotal(inv).total)})`, { projectId: inv.projectId, clientId: inv.clientId });
  revalidatePath("/studio", "layout");
}

export async function sendInvoice(invoiceId: string) {
  await requireOwner();
  const inv = getInvoice(invoiceId);
  if (!inv) return;
  if (inv.status === "draft") inv.status = "sent";
  inv.issuedAt = new Date().toISOString();
  // TODO: email invoice link.
  revalidatePath("/studio", "layout");
}

/* ---------- Client: booking ---------- */

export async function bookShoot(fd: FormData) {
  const session = await requireClient();
  const input = projectInput(fd);
  if (!input.address || !input.date) redirect("/portal/book?error=missing");
  const project = await createProjectWithShoot({ ...input, clientId: session.clientId, serviceIds: servicesFromPackage(fd), confirmed: false });
  log("booking", `${session.name} requested a shoot at ${project.address}`, { projectId: project.id, clientId: session.clientId });
  revalidatePath("/portal", "layout");
  revalidatePath("/studio", "layout");
  redirect(`/portal/properties/${project.id}?booked=1`);
}

/* ---------- Client: payment ---------- */

export async function startCheckout(invoiceId: string) {
  const session = await requireClient();
  const inv = getInvoice(invoiceId);
  if (!inv || inv.clientId !== session.clientId) redirect("/portal");
  const p = getProject(inv.projectId)!;
  const back = `/portal/properties/${p.id}`;
  const checkout = await payments.createCheckoutSession({
    invoiceId: inv.id,
    invoiceNumber: inv.number,
    amountCents: invoiceTotal(inv).total,
    currency: "usd",
    customerEmail: session.email,
    description: p.address,
    successUrl: `${back}?paid=1`,
    cancelUrl: back,
  });
  redirect(checkout.url);
}

/** Only used by the mock checkout page. With Stripe, the webhook does this. */
export async function completeMockCheckout(fd: FormData) {
  const session = await getSession();
  const inv = getInvoice(str(fd, "invoice"));
  const success = str(fd, "success");
  if (!session || session.role !== "client" || !inv || inv.clientId !== session.clientId) redirect("/portal");
  inv.status = "paid";
  inv.paidAt = new Date().toISOString();
  inv.paymentRef = str(fd, "session") || "mock";
  const p = getProject(inv.projectId);
  log("payment", `Payment received for ${inv.number} (${money(invoiceTotal(inv).total)})`, { projectId: inv.projectId, clientId: inv.clientId });
  revalidatePath("/portal", "layout");
  revalidatePath("/studio", "layout");
  redirect(success.startsWith("/portal") ? success : `/portal/properties/${p?.id}`);
}
