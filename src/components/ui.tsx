import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { InvoiceStatus, ProjectStatus, ShootStatus } from "@/lib/types";

/* ---------- Buttons ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong shadow-sm",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-bad-soft text-bad hover:brightness-95",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ---------- Surfaces ---------- */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({ title, action, sub }: { title: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[13px] font-medium text-muted">{eyebrow}</div>}
        <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight sm:text-[34px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 rounded-full bg-surface-2 p-3 text-muted [&_svg]:size-6">{icon}</div>}
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Badges ---------- */

type Tone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent-soft text-accent-strong dark:text-accent",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const projectTone: Record<ProjectStatus, [Tone, string]> = {
  scheduled: ["info", "Scheduled"],
  editing: ["warn", "In editing"],
  delivered: ["ok", "Delivered"],
  archived: ["neutral", "Archived"],
};
export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <Badge tone={projectTone[status][0]} dot>
    {projectTone[status][1]}
  </Badge>
);

const invoiceTone: Record<InvoiceStatus, [Tone, string]> = {
  draft: ["neutral", "Draft"],
  sent: ["info", "Awaiting payment"],
  paid: ["ok", "Paid"],
  overdue: ["bad", "Overdue"],
  void: ["neutral", "Void"],
};
export const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => (
  <Badge tone={invoiceTone[status][0]} dot>
    {invoiceTone[status][1]}
  </Badge>
);

const shootTone: Record<ShootStatus, [Tone, string]> = {
  requested: ["warn", "Requested"],
  confirmed: ["accent", "Confirmed"],
  completed: ["neutral", "Completed"],
  cancelled: ["bad", "Cancelled"],
};
export const ShootStatusBadge = ({ status }: { status: ShootStatus }) => (
  <Badge tone={shootTone[status][0]} dot>
    {shootTone[status][1]}
  </Badge>
);

/* ---------- Avatar ---------- */

export function Avatar({ name, hue = 160, size = 36, className }: { name: string; hue?: number; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `oklch(0.9 0.05 ${hue})`,
        color: `oklch(0.35 0.08 ${hue})`,
      }}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Forms ---------- */

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const Input = ({ className, ...props }: ComponentProps<"input">) => <input className={cn("field", className)} {...props} />;
export const Textarea = ({ className, ...props }: ComponentProps<"textarea">) => <textarea className={cn("field min-h-24", className)} {...props} />;
export const Select = ({ className, ...props }: ComponentProps<"select">) => <select className={cn("field appearance-auto", className)} {...props} />;

/* ---------- Stat tile ---------- */

export function Stat({ label, value, sub, icon, href }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between text-[13px] font-medium text-muted">
        {label}
        {icon && <span className="text-muted [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="tabular mt-2 font-display text-[30px] leading-none font-medium tracking-tight">{value}</div>
      {sub && <div className="mt-2 text-[13px] text-ink-2">{sub}</div>}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5";
  return href ? (
    <Link href={href} className={cn(cls, "transition hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
