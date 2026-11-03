import { CalendarDays, CheckCircle2, Clock, Download, Globe, Lock, Sofa, Sparkles } from "lucide-react";
import { StagingOffer } from "@/components/staging-dialog";
import Link from "next/link";
import { InvoiceLines } from "@/components/invoice-lines";
import { MediaGallery } from "@/components/media-gallery";
import { ProgressSteps, projectSteps } from "@/components/progress-steps";
import { PropertyImage } from "@/components/property-image";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, CardHeader, InvoiceStatusBadge, ShootStatusBadge } from "@/components/ui";
import { startCheckout } from "@/lib/actions";
import { date, money, time } from "@/lib/format";
import { invoiceTotal } from "@/lib/invoice";
import { ROOM_TYPES, STYLES } from "@/lib/staging-options";
import { projectZipHref } from "@/lib/links";
import type { Invoice, MediaView, Project, Shoot, StagingRequest } from "@/lib/types";

// The delivery page body, shared by the agent portal and the stand-alone
// delivery link (/d/<token>), so both always show the same thing.

export interface DeliveryViewProps {
  project: Project;
  shoot?: Shoot;
  invoice?: Invoice;
  media: MediaView[];
  unlocked: boolean;
  hero: string | null;
  /** Set on the stand-alone page; carried into download and payment links. */
  token?: string;
  flash?: { paid?: boolean; booked?: boolean; payOffline?: boolean; staging?: boolean };
  staging?: { price: number; offered: boolean; canOrder: boolean; photos: { id: string; thumbUrl: string | null; filename: string }[]; requests: StagingRequest[] } | null;
}

const stagingStatus: Record<StagingRequest["status"], string> = {
  awaiting_payment: "Awaiting payment",
  queued: "In the queue",
  processing: "Staging now",
  done: "Ready",
  failed: "Couldn't stage; the studio will follow up",
  cancelled: "Cancelled",
};

export function DeliveryView({ project: p, shoot, invoice, media, unlocked, hero, token, flash = {}, staging }: DeliveryViewProps) {
  const delivered = p.status === "delivered" || p.status === "archived";
  const total = invoice ? invoiceTotal(invoice).total : 0;
  const hasFiles = media.some((m) => m.downloadUrl);
  const hasMls = media.some((m) => m.mlsUrl);
  const portal = !token;
  const siteLive = delivered && unlocked && p.sitePublished && !!p.siteSlug;
  const showSite = !!p.siteSlug && (siteLive || portal);

  return (
    <>
      {flash.paid && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-[14px] text-ok">
          <CheckCircle2 className="size-5 shrink-0" /> {unlocked ? "Payment received. Your downloads are unlocked." : "Thanks! We're confirming your payment; this page unlocks in a moment."}
        </div>
      )}
      {flash.staging && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-[14px] text-ok">
          <Sofa className="size-5 shrink-0" /> Virtual staging ordered. Staged photos will appear in your gallery when they&apos;re ready.
        </div>
      )}
      {flash.booked && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-[14px] text-ok">
          <CheckCircle2 className="size-5 shrink-0" /> Request sent. We&apos;ll confirm your shoot shortly.
        </div>
      )}
      {flash.payOffline && (
        <div className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-[14px] text-warn">Online payment isn&apos;t set up yet. Please contact the studio to pay this invoice.</div>
      )}

      <div className="relative mb-6 overflow-hidden rounded-2xl border border-line">
        <div className="aspect-[4/3] sm:aspect-[21/8]">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="" className="h-full w-full object-cover" />
          ) : (
            <PropertyImage seed={p.coverSeed} label={p.address} />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 text-white sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h1 className="font-display text-[26px] leading-tight font-medium tracking-tight sm:text-[36px]">{p.address}</h1>
            <p className="text-[14px] text-white/80">
              {[p.city && `${p.city}, ${p.state} ${p.zip}`.trim(), p.beds != null && `${p.beds} bd`, p.baths != null && `${p.baths} ba`, p.sqft != null && `${p.sqft.toLocaleString()} sqft`, p.acreage != null && `${p.acreage} ac`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {delivered && unlocked && hasFiles && (
            <div className="flex flex-wrap gap-2">
              <a href={projectZipHref(p.id, { token })} className={buttonClass("secondary", "md", "border-transparent")} title="Every original file, full resolution">
                <Download /> Full quality
              </a>
              {hasMls && (
                <a href={projectZipHref(p.id, { token, mls: true })} className={buttonClass("secondary", "md", "border-transparent")} title="Photos at 2048px, each under 1 MB, plus floor plans">
                  <Download /> MLS size
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <Card className="mb-6 px-4 py-5 sm:px-8">
        <ProgressSteps steps={projectSteps(p, shoot, invoice, media.length || (delivered ? 1 : 0))} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
        <div className="space-y-6">
          {delivered && invoice && !unlocked && (
            <div className="flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold">Your media is ready</p>
                  <p className="text-[14px] text-ink-2">Browse the previews below. Pay {money(total)} to download full quality and MLS-size files.</p>
                </div>
              </div>
              <form action={startCheckout.bind(null, invoice.id, token)}>
                <SubmitButton size="lg" className="w-full sm:w-auto">
                  Pay {money(total)} and unlock
                </SubmitButton>
              </form>
            </div>
          )}

          {delivered && staging?.offered && staging.canOrder && (
            <StagingOffer projectId={p.id} token={token} photos={staging.photos} price={staging.price} canOrder={staging.canOrder} roomTypes={ROOM_TYPES} styles={STYLES} />
          )}

          <Card>
            <CardHeader
              title="Media"
              sub={delivered ? `${media.length} ${media.length === 1 ? "item" : "items"}${unlocked ? " · choose Full quality or MLS when downloading" : " · preview only"}` : undefined}
            />
            <div className="p-4 sm:p-5">
              {delivered ? (
                <MediaGallery items={media} mode="client" locked={!unlocked} projectId={p.id} />
              ) : (
                <div className="flex flex-col items-center px-4 py-12 text-center">
                  <span className="mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
                    {p.status === "editing" ? <Sparkles className="size-6" /> : <CalendarDays className="size-6" />}
                  </span>
                  <p className="font-medium">{p.status === "editing" ? "We're editing your media" : "Your shoot is on the calendar"}</p>
                  <p className="mt-1 max-w-sm text-sm text-muted">
                    {p.status === "editing" ? "Most galleries are delivered within 24 hours of the shoot. We'll email and text you when it's ready." : "Photos will appear here as soon as they're delivered."}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {delivered && staging?.offered && !staging.canOrder && (
            <StagingOffer projectId={p.id} token={token} photos={staging.photos} price={staging.price} canOrder={false} roomTypes={ROOM_TYPES} styles={STYLES} />
          )}
        </div>

        <div className="space-y-6">
          {staging && staging.requests.length > 0 && (
            <Card>
              <CardHeader title="Your staging orders" />
              <div className="space-y-4 p-5">
                {(
                  <ul className="space-y-2 text-[13px]">
                    {staging.requests.map((r) => {
                      const src = staging.photos.find((x) => x.id === r.mediaId);
                      return (
                        <li key={r.id} className="flex items-center gap-3">
                          {src?.thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src.thumbUrl} alt="" className="h-9 w-12 shrink-0 rounded object-cover" />
                          ) : (
                            <span className="h-9 w-12 shrink-0 rounded bg-surface-2" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {r.roomType} · {r.style}
                            </span>
                            <span className={r.status === "done" ? "text-ok" : r.status === "failed" ? "text-bad" : "text-muted"}>{stagingStatus[r.status]}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>
          )}
          {showSite && (
            <Card>
              <CardHeader title="Property website" sub={siteLive ? "Share it on social or with buyers" : "Goes live once your media is delivered and paid"} />
              <div className="space-y-2 p-5">
                <a href={`/p/${p.siteSlug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm", "w-full justify-start")}>
                  <Globe /> Branded site{!siteLive && " (preview)"}
                </a>
                <a href={`/p/${p.siteSlug}/u`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm", "w-full justify-start")}>
                  <Globe /> Unbranded site (for MLS){!siteLive && " (preview)"}
                </a>
                {portal && (
                  <Link href={`/portal/properties/${p.id}/site`} className="block pt-1 text-[13px] font-medium text-accent hover:underline">
                    Edit template and description
                  </Link>
                )}
              </div>
            </Card>
          )}
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
                {portal && (
                  <Link href={`/portal/invoices/${invoice.id}`} className={buttonClass("secondary", "sm", "mt-4")}>
                    View invoice
                  </Link>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

