import { ArrowLeft, CalendarCheck, CalendarDays, Clock, Download, KeyRound, Mail, Phone, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceLines } from "@/components/invoice-lines";
import { MediaGallery } from "@/components/media-gallery";
import { ProgressSteps, projectSteps } from "@/components/progress-steps";
import { SubmitButton } from "@/components/submit-button";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Avatar, Badge, buttonClass, Card, CardHeader, InvoiceStatusBadge, ProjectStatusBadge, ShootStatusBadge } from "@/components/ui";
import { completeShoot, confirmShoot, deliverProject, markInvoicePaidManually, sendInvoice, setProjectStatus } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { db, getClient, getInvoice, getMedia, getProject, getShoot } from "@/lib/data";
import { date, money, time } from "@/lib/format";
import { projectZipHref } from "@/lib/links";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = getProject((await params).id);
  return { title: p?.address ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const p = getProject(id);
  if (!p) notFound();
  const client = getClient(p.clientId);
  const shoot = getShoot(p.shootId);
  const invoice = getInvoice(p.invoiceId);
  const media = getMedia(p.id);
  const services = p.serviceIds.map((s) => db.services.find((x) => x.id === s)!).filter(Boolean);
  const steps = projectSteps(p, shoot, invoice, media.length);
  const canDeliver = media.length > 0 && p.status !== "delivered" && p.status !== "archived";

  return (
    <>
      <Link href="/studio/projects" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Projects
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={p.status} />
            {invoice && <InvoiceStatusBadge status={invoice.status} />}
          </div>
          <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight sm:text-[34px]">{p.address}</h1>
          <p className="mt-1 text-[15px] text-ink-2">
            {p.city}, {p.state} {p.zip}
            {p.beds && ` · ${p.beds} bd`}
            {p.baths && ` · ${p.baths} ba`}
            {p.sqft && ` · ${p.sqft.toLocaleString()} sqft`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {media.length > 0 && (
            <a href={projectZipHref(p.id)} className={buttonClass("secondary")}>
              <Download /> All files
            </a>
          )}
          {canDeliver && (
            <form action={deliverProject.bind(null, p.id)}>
              <SubmitButton>
                <Send /> Deliver to {client?.name.split(" ")[0]}
              </SubmitButton>
            </form>
          )}
          {p.status === "delivered" && (
            <form action={setProjectStatus.bind(null, p.id, "archived")}>
              <SubmitButton variant="secondary">Archive</SubmitButton>
            </form>
          )}
        </div>
      </div>

      <Card className="mb-6 px-4 py-5 sm:px-8">
        <ProgressSteps steps={steps} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <Card>
          <CardHeader title="Media" sub={media.length ? `${media.length} files` : "Nothing uploaded yet"} />
          <div className="space-y-6 p-5">
            {p.status !== "archived" && <UploadDropzone projectId={p.id} />}
            <MediaGallery items={media} mode="owner" projectId={p.id} />
          </div>
        </Card>

        <div className="space-y-6">
          {shoot && (
            <Card>
              <CardHeader title="Shoot" action={<ShootStatusBadge status={shoot.status} />} />
              <div className="space-y-3 p-5 text-[14px]">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="size-4 text-muted" />
                  {date(shoot.start, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 text-muted" />
                  {time(shoot.start)} to {time(shoot.end)}
                </div>
                {shoot.accessNotes && (
                  <div className="flex gap-2.5">
                    <KeyRound className="mt-0.5 size-4 shrink-0 text-muted" />
                    <span className="text-ink-2">{shoot.accessNotes}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="size-4 text-muted" />
                  {shoot.calendarEventId ? (
                    <span className="text-ink-2">On Google Calendar</span>
                  ) : (
                    <span className="text-muted">Not on calendar yet</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {shoot.status === "requested" && (
                    <form action={confirmShoot.bind(null, shoot.id)}>
                      <SubmitButton size="sm">Confirm booking</SubmitButton>
                    </form>
                  )}
                  {shoot.status === "confirmed" && (
                    <form action={completeShoot.bind(null, shoot.id)}>
                      <SubmitButton size="sm" variant="secondary">
                        Mark as shot
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          )}

          {client && (
            <Card>
              <CardHeader title="Agent" />
              <div className="p-5">
                <Link href={`/studio/clients/${client.id}`} className="flex items-center gap-3">
                  <Avatar name={client.name} hue={client.hue} size={40} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{client.name}</div>
                    <div className="truncate text-[13px] text-muted">{client.brokerage}</div>
                  </div>
                </Link>
                <div className="mt-4 space-y-2 text-[13px]">
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2.5 text-ink-2 hover:text-ink">
                    <Mail className="size-4 text-muted" /> {client.email}
                  </a>
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2.5 text-ink-2 hover:text-ink">
                    <Phone className="size-4 text-muted" /> {client.phone}
                  </a>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Invoice"
              sub={invoice ? `${invoice.number} · due ${date(invoice.dueAt, { month: "short", day: "numeric" })}` : "Created when you deliver"}
              action={invoice && <InvoiceStatusBadge status={invoice.status} />}
            />
            <div className="p-5">
              {invoice ? (
                <>
                  <InvoiceLines invoice={invoice} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/studio/invoices/${invoice.id}`} className={buttonClass("secondary", "sm")}>
                      View invoice
                    </Link>
                    {invoice.status === "draft" && (
                      <form action={sendInvoice.bind(null, invoice.id)}>
                        <SubmitButton size="sm">Send</SubmitButton>
                      </form>
                    )}
                    {(invoice.status === "sent" || invoice.status === "overdue") && (
                      <form action={markInvoicePaidManually.bind(null, invoice.id)}>
                        <SubmitButton size="sm" variant="ghost">
                          Mark paid
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                  {invoice.status !== "paid" && <p className="mt-3 text-xs text-muted">Downloads unlock for the agent once this is paid.</p>}
                </>
              ) : (
                <ul className="space-y-1.5 text-[14px]">
                  {services.map((s) => (
                    <li key={s.id} className="flex justify-between">
                      <span className="text-ink-2">{s.name}</span>
                      <span className="tabular">{money(s.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Services" />
            <div className="flex flex-wrap gap-1.5 p-5">
              {services.map((s) => (
                <Badge key={s.id}>{s.name}</Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
