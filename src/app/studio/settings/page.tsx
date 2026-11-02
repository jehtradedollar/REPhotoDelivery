import { Building2, CalendarDays, ChevronRight, CreditCard, HardDrive, Mail, MapPin, MessageSquare, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { Badge, buttonClass, Card, CardHeader, Field, Input, PageHeader } from "@/components/ui";
import { changePassword, disconnectGoogleCalendar } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { integrationStatus } from "@/lib/integrations";

export const metadata: Metadata = { title: "Settings" };

const icons = { storage: HardDrive, payments: CreditCard, calendar: CalendarDays, mail: Mail, sms: MessageSquare };

const sections = [
  { href: "/studio/settings/messages", icon: MessageSquare, title: "Delivery email and text", body: "What agents receive when you mark a project delivered" },
  { href: "/studio/settings/catalog", icon: Package, title: "Services and packages", body: "Prices and bundles agents can book" },
  { href: "/studio/settings/zones", icon: MapPin, title: "Location zones and stock media", body: "Local-area photo packs offered when booking inside a zone" },
  { href: "/studio/brokerages", icon: Building2, title: "Brokerages", body: "Logos and colors agents inherit on property websites" },
];

const pwMessages: Record<string, { tone: "ok" | "bad"; text: string }> = {
  ok: { tone: "ok", text: "Password changed. Other devices were signed out." },
  wrong: { tone: "bad", text: "Your current password didn't match." },
  short: { tone: "bad", text: "The new password needs at least 8 characters." },
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string; pw?: string }> }) {
  const session = await requireOwner();
  const q = await searchParams;
  const status = await integrationStatus();
  const pw = q.pw ? pwMessages[q.pw] : undefined;

  return (
    <>
      <PageHeader title="Settings" description="Connected services, messages, prices and your account." />
      {q.google === "connected" && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Google Calendar connected. Confirmed shoots now land on your calendar.</p>}
      {q.google === "error" && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">Google Calendar didn&apos;t connect. Try again, and allow calendar access when Google asks.</p>}

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Connected services" sub="Add keys in your hosting environment; see docs/DEPLOY.md" />
          <ul className="divide-y divide-line">
            {status.map((i) => {
              const Icon = icons[i.key];
              return (
                <li key={i.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2">
                    <Icon className="size-5 text-ink-2" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{i.label}</span>
                    <span className="block text-[13px] text-muted">{i.detail}</span>
                  </span>
                  {i.key === "calendar" && i.state === "ready" ? (
                    <a href="/api/google/connect" className={buttonClass("primary", "sm")}>
                      Connect
                    </a>
                  ) : i.key === "calendar" && i.state === "connected" ? (
                    <form action={disconnectGoogleCalendar}>
                      <SubmitButton size="sm" variant="ghost">
                        Disconnect
                      </SubmitButton>
                    </form>
                  ) : i.state === "connected" ? (
                    <Badge tone="ok" dot>
                      Live
                    </Badge>
                  ) : i.state === "off" ? (
                    <Badge dot>Off</Badge>
                  ) : (
                    <Badge tone="warn" dot>
                      {i.state === "local" ? "Local" : "Demo"}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <ul className="divide-y divide-line">
              {sections.map((x) => (
                <li key={x.href}>
                  <Link href={x.href} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                      <x.icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">{x.title}</span>
                      <span className="block text-[13px] text-muted">{x.body}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Studio profile" sub="Shown on invoices, emails and the agent portal" />
            <dl className="grid gap-3 p-5 text-[14px] sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-[12px] text-muted">Business name</dt>
                <dd className="font-medium">{brand.name}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Email</dt>
                <dd className="break-all">{brand.email}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Phone</dt>
                <dd>{brand.phone}</dd>
              </div>
              <p className="text-[12px] text-muted sm:col-span-2">
                Change these with the NEXT_PUBLIC_STUDIO_NAME, NEXT_PUBLIC_STUDIO_EMAIL and NEXT_PUBLIC_STUDIO_PHONE environment variables.
              </p>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Your password" sub={`Signed in as ${session.email}`} />
            <form action={changePassword} className="grid gap-4 p-5 sm:grid-cols-2">
              {pw && <p className={`rounded-lg px-4 py-3 text-sm sm:col-span-2 ${pw.tone === "ok" ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{pw.text}</p>}
              <Field label="Current password">
                <Input name="current" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton variant="secondary">Change password</SubmitButton>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
