import { ArrowLeft, CalendarCheck, CalendarDays, Clock, Download, ExternalLink, Globe, KeyRound, Link2, Mail, Pencil, Phone, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyField } from "@/components/copy-field";
import { InvoiceLines } from "@/components/invoice-lines";
import { MediaGallery } from "@/components/media-gallery";
import { ProgressSteps, projectSteps } from "@/components/progress-steps";
import { RescheduleForm } from "@/components/reschedule-form";
import { SubmitButton } from "@/components/submit-button";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Avatar, Badge, buttonClass, Card, CardHeader, Input, InvoiceStatusBadge, ProjectStatusBadge, ShootStatusBadge } from "@/components/ui";
import {
  addTourLink,
  cancelShoot,
  completeShoot,
  confirmShoot,
  createDraftInvoice,
  deliverProject,
  cancelStagingRequest,
  markInvoicePaidManually,
  refreshStaging,
  rotateDeliveryLink,
  sendInvoice,
  setProjectStatus,
} from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { getClient, getInvoice, getMedia, getProject, getServices, getShoot, mediaViews } from "@/lib/data";
import { stagingRequestsFor } from "@/lib/staging";
import { stockViews } from "@/lib/stock";
import { StagingFulfil } from "@/components/staging-fulfil";
import { date, money, time } from "@/lib/format";
import { calendar, staging } from "@/lib/integrations";
import { deliveryPath, projectZipHref } from "@/lib/links";
import { appUrl } from "@/lib/url";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getProject((await params).id);
  return { title: p?.address ?? "Project" };
}

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; rescheduled?: string }> }) {
  await requireOwner();
  const { id } = await params;
  const q = await searchParams;
  const p = await getProject(id);
  if (!p) notFound();
  const [client, shoot, invoice, media, allServices, calendarOn] = await Promise.all([
    getClient(p.clientId),
    getShoot(p.shootId),
    getInvoice(p.invoiceId),
    getMedia(p.id),
    getServices({ includeInactive: true }),
    calendar.isConnected(),
  ]);
  const views = [...(await mediaViews(media, true)), ...(await stockViews(p, true))];
  const services = p.serviceIds.map((sid) => allServices.find((x) => x.id === sid)).filter((x) => !!x);
  const steps = projectSteps(p, shoot, invoice, media.length);
  const canDeliver = media.length > 0 && p.status !== "delivered" && p.status !== "archived";
  const hasFiles = media.some((m) => m.storageKey);
  const stagingReqs = (await stagingRequestsFor(p.id)).filter((r) => r.status !== "awaiting_payment");
  const deliveryUrl = p.deliveryToken ? appUrl(deliveryPath(p.deliveryToken)) : null;

  return (
    <>
      <Link href="/studio/projects" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Projects
      </Link>

      {q.rescheduled && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Shoot moved{shoot?.calendarEventId ? " and your calendar updated" : ""}.</p>}
      {q.error === "tour" && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">Links need to start with https://.</p>}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={p.status} />
            {invoice && <InvoiceStatusBadge status={invoice.status} />}
          </div>
          <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight sm:text-[34px]">{p.address}</h1>
          <p className="mt-1 text-[15px] text-ink-2">
            {p.city}, {p.state} {p.zip}
            {p.beds != null && ` · ${p.beds} bd`}
            {p.baths != null && ` · ${p.baths} ba`}
            {p.sqft != null && ` · ${p.sqft.toLocaleString()} sqft`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/studio/projects/${p.id}/edit`} className={buttonClass("ghost")}>
            <Pencil /> Edit
          </Link>
          {hasFiles && (
            <>
              <a href={projectZipHref(p.id)} className={buttonClass("secondary")} title="Every original file">
                <Download /> Full quality
              </a>
              <a href={projectZipHref(p.id, { mls: true })} className={buttonClass("ghost")} title="Photos at 2048px, each under 1 MB">
                <Download /> MLS
              </a>
            </>
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
          {p.status === "archived" && (
            <form action={setProjectStatus.bind(null, p.id, invoice || media.length ? "delivered" : "scheduled")}>
              <SubmitButton variant="secondary">Restore</SubmitButton>
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
            <MediaGallery items={views} mode="owner" projectId={p.id} />
            {p.status !== "archived" && (
              <form action={addTourLink.bind(null, p.id)} className="border-t border-line pt-5">
                <p className="mb-2 text-[13px] font-semibold">Embedded links</p>
                <p className="mb-3 text-[13px] text-muted">Vimeo, YouTube, Matterport, iGUIDE, Kuula and similar links play right inside the agent&apos;s gallery.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input name="label" placeholder="Label, e.g. Walkthrough video" className="sm:w-56" />
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                    <Input name="url" type="url" required placeholder="https://vimeo.com/…" className="pl-9" />
                  </div>
                  <SubmitButton variant="secondary">Add link</SubmitButton>
                </div>
              </form>
            )}
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
                  ) : calendarOn ? (
                    <span className="text-muted">Added when confirmed</span>
                  ) : (
                    <Link href="/studio/settings" className="text-muted underline-offset-2 hover:underline">
                      Google Calendar not connected
                    </Link>
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
                  {(shoot.status === "requested" || shoot.status === "confirmed") && (
                    <>
                      <RescheduleForm shootId={shoot.id} start={shoot.start} />
                      <ConfirmButton action={cancelShoot.bind(null, shoot.id)} message="Cancel this shoot? The agent will get an email and the calendar event is removed." variant="ghost" size="sm">
                        Cancel shoot
                      </ConfirmButton>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {stagingReqs.length > 0 && (
            <Card>
              <CardHeader
                title="Virtual staging"
                sub={staging.name === "manual" ? "No staging API connected: upload each staged photo here" : "Sent to the staging API"}
                action={
                  staging.name === "http" && stagingReqs.some((r) => r.status === "processing" || r.status === "queued") ? (
                    <form action={refreshStaging.bind(null, p.id)}>
                      <SubmitButton size="sm" variant="ghost">
                        Check now
                      </SubmitButton>
                    </form>
                  ) : undefined
                }
              />
              <ul className="divide-y divide-line">
                {stagingReqs.map((r) => {
                  const src = views.find((v) => v.id === r.mediaId);
                  const open = r.status === "queued" || r.status === "processing" || r.status === "failed";
                  return (
                    <li key={r.id} className="space-y-2 px-5 py-3 text-[13px]">
                      <div className="flex items-center gap-3">
                        {src?.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src.thumbUrl} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="h-10 w-14 shrink-0 rounded bg-surface-2" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {r.roomType} · {r.style}
                          </div>
                          <div className={r.status === "failed" ? "text-bad" : r.status === "done" ? "text-ok" : "text-muted"}>
                            {r.status === "failed" ? (r.error ?? "Failed") : r.status === "done" ? "Delivered" : r.status === "processing" ? "Staging" : r.status === "cancelled" ? "Cancelled" : "Waiting"}
                          </div>
                        </div>
                      </div>
                      {r.prompt && <p className="rounded-lg bg-surface-2 px-3 py-2 text-ink-2">&ldquo;{r.prompt}&rdquo;</p>}
                      {open && (
                        <div className="flex flex-wrap items-center gap-2">
                          <StagingFulfil requestId={r.id} />
                          <ConfirmButton action={cancelStagingRequest.bind(null, r.id)} message="Cancel this staging request? Refund the agent separately if needed." variant="ghost" size="sm">
                            Cancel
                          </ConfirmButton>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {deliveryUrl && (
            <Card>
              <CardHeader title="Delivery page" sub="Stand-alone link for the agent; no sign-in needed" />
              <div className="space-y-3 p-5">
                <CopyField value={deliveryUrl} />
                <div className="flex flex-wrap gap-2">
                  <a href={deliveryPath(p.deliveryToken!)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                    <ExternalLink /> Open
                  </a>
                  {p.siteSlug && (
                    <Link href={`/studio/projects/${p.id}/site`} className={buttonClass("ghost", "sm")}>
                      <Globe /> Property website
                    </Link>
                  )}
                  <ConfirmButton action={rotateDeliveryLink.bind(null, p.id)} message="Make a new link? The current one stops working right away." variant="ghost" size="sm">
                    New link
                  </ConfirmButton>
                </div>
                <p className="text-xs text-muted">This is the link the delivery email and text send. Downloads stay locked until the invoice is paid.</p>
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
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-2.5 text-ink-2 hover:text-ink">
                      <Phone className="size-4 text-muted" /> {client.phone}
                    </a>
                  )}
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
                      {invoice.status === "paid" ? "View invoice" : "View or edit"}
                    </Link>
                    {invoice.status === "draft" && p.status === "delivered" && (
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
                  {invoice.status !== "paid" && invoice.status !== "void" && <p className="mt-3 text-xs text-muted">Downloads unlock for the agent once this is paid.</p>}
                </>
              ) : (
                <>
                  <ul className="space-y-1.5 text-[14px]">
                    {services.map((x) => (
                      <li key={x.id} className="flex justify-between">
                        <span className="text-ink-2">{x.name}</span>
                        <span className="tabular">{money(x.price)}</span>
                      </li>
                    ))}
                  </ul>
                  <form action={createDraftInvoice.bind(null, p.id)} className="mt-4">
                    <SubmitButton size="sm" variant="secondary">
                      Draft invoice now
                    </SubmitButton>
                  </form>
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Services" action={<Link href={`/studio/projects/${p.id}/edit`} className="text-[13px] font-medium text-accent hover:underline">Change</Link>} />
            <div className="flex flex-wrap gap-1.5 p-5">
              {services.length ? services.map((x) => <Badge key={x.id}>{x.name}</Badge>) : <span className="text-sm text-muted">None selected</span>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
