import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Download, Lock, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceLines } from "@/components/invoice-lines";
import { MediaGallery } from "@/components/media-gallery";
import { ProgressSteps, projectSteps } from "@/components/progress-steps";
import { PropertyImage } from "@/components/property-image";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, CardHeader, InvoiceStatusBadge, ShootStatusBadge } from "@/components/ui";
import { startCheckout } from "@/lib/actions";
import { requireClient } from "@/lib/auth";
import { getInvoice, getMedia, getProject, getShoot, invoiceTotal, isUnlocked } from "@/lib/data";
import { date, money, time } from "@/lib/format";
import { projectZipHref } from "@/lib/links";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: getProject((await params).id)?.address ?? "Property" };
}

export default async function PortalProperty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; booked?: string }> }) {
  const s = await requireClient();
  const { id } = await params;
  const { paid, booked } = await searchParams;
  const p = getProject(id);
  if (!p || p.clientId !== s.clientId) notFound();
  const shoot = getShoot(p.shootId);
  const invoice = getInvoice(p.invoiceId);
  const delivered = p.status === "delivered" || p.status === "archived";
  const media = delivered ? getMedia(p.id) : [];
  const unlocked = isUnlocked(p);
  const total = invoice ? invoiceTotal(invoice).total : 0;

  return (
    <>
      <Link href="/portal" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Properties
      </Link>

      {paid && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-[14px] text-ok">
          <CheckCircle2 className="size-5" /> Payment received. Your downloads are unlocked.
        </div>
      )}
      {booked && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-[14px] text-ok">
          <CheckCircle2 className="size-5" /> Request sent. We&apos;ll confirm your shoot shortly.
        </div>
      )}

      <div className="relative mb-6 overflow-hidden rounded-2xl border border-line">
        <div className="aspect-[16/9] sm:aspect-[21/7]">
          <PropertyImage seed={p.coverSeed} label={p.address} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 text-white sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h1 className="font-display text-[26px] leading-tight font-medium tracking-tight sm:text-[36px]">{p.address}</h1>
            <p className="text-[14px] text-white/80">
              {p.city}, {p.state} {p.zip}
              {p.beds && ` · ${p.beds} bd`}
              {p.baths && ` · ${p.baths} ba`}
              {p.sqft && ` · ${p.sqft.toLocaleString()} sqft`}
            </p>
          </div>
          {delivered && unlocked && media.length > 0 && (
            <a href={projectZipHref(p.id)} className={buttonClass("secondary", "md", "border-transparent")}>
              <Download /> Download all
            </a>
          )}
        </div>
      </div>

      <Card className="mb-6 px-4 py-5 sm:px-8">
        <ProgressSteps steps={projectSteps(p, shoot, invoice, media.length || (delivered ? 1 : 0))} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
        <div className="min-w-0 space-y-6">
          {delivered && invoice && !unlocked && (
            <div className="flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold">Your media is ready</p>
                  <p className="text-[14px] text-ink-2">Browse the previews below. Pay {money(total)} to download full-resolution, MLS-ready files.</p>
                </div>
              </div>
              <form action={startCheckout.bind(null, invoice.id)}>
                <SubmitButton size="lg" className="w-full sm:w-auto">
                  Pay {money(total)} and unlock
                </SubmitButton>
              </form>
            </div>
          )}

          <Card>
            <CardHeader title="Media" sub={delivered ? `${media.length} files${unlocked ? " · ready to download" : " · preview only"}` : undefined} />
            <div className="p-5">
              {delivered ? (
                <MediaGallery items={media} mode="client" locked={!unlocked} projectId={p.id} />
              ) : (
                <div className="flex flex-col items-center px-4 py-12 text-center">
                  <span className="mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
                    {p.status === "editing" ? <Sparkles className="size-6" /> : <CalendarDays className="size-6" />}
                  </span>
                  <p className="font-medium">{p.status === "editing" ? "We're editing your media" : "Your shoot is on the calendar"}</p>
                  <p className="mt-1 max-w-sm text-sm text-muted">
                    {p.status === "editing"
                      ? "Most galleries are delivered within 24 hours of the shoot. We'll email you when it's ready."
                      : "Photos will appear here as soon as they're delivered."}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

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
                {shoot.status === "requested" && <p className="text-[13px] text-muted">Waiting for the studio to confirm this time.</p>}
              </div>
            </Card>
          )}
          {invoice && invoice.status !== "draft" && (
            <Card>
              <CardHeader title="Invoice" sub={invoice.number} action={<InvoiceStatusBadge status={invoice.status} />} />
              <div className="p-5">
                <InvoiceLines invoice={invoice} />
                <Link href={`/portal/invoices/${invoice.id}`} className={buttonClass("secondary", "sm", "mt-4")}>
                  View invoice
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
