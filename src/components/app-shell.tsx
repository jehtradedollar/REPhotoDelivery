"use client";

import {
  Building2,
  CalendarDays,
  CalendarPlus,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Receipt,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/lib/actions";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./ui";

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  projects: FolderOpen,
  clients: Users,
  invoices: Receipt,
  settings: Settings,
  properties: Building2,
  book: CalendarPlus,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof icons;
  /** Show in the phone bottom bar. Others go under "More". */
  primary?: boolean;
  exact?: boolean;
  /** Extra path prefixes that also mark this item active. */
  match?: string[];
  badge?: number;
}

function isActive(pathname: string, item: NavItem) {
  if (item.match?.some((m) => pathname.startsWith(m))) return true;
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

function Logo({ area }: { area: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v9.5h13V10" />
          <circle cx="12" cy="14.5" r="2.6" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[17px] font-medium tracking-tight">{brand.short}</span>
        <span className="block text-[11px] font-medium tracking-wide text-muted uppercase">{area}</span>
      </span>
    </span>
  );
}

export function AppShell({
  nav,
  area,
  user,
  children,
}: {
  nav: NavItem[];
  area: string;
  user: { name: string; email: string; hue?: number };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);

  const bottom = nav.filter((n) => n.primary);
  const overflow = nav.filter((n) => !n.primary);
  const overflowActive = overflow.some((n) => isActive(pathname, n));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 pt-5 pb-6">
          <Link href={nav[0].href}>
            <Logo area={area} />
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
          {nav.map((item) => {
            const Icon = icons[item.icon];
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition",
                  active ? "bg-accent-soft text-accent-strong dark:text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon className="size-[18px]" />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className="tabular rounded-full bg-warm px-1.5 text-[11px] leading-[18px] font-semibold text-white">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={user.name} hue={user.hue} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{user.name}</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <ThemeToggle withLabel className="flex-1 justify-start" />
            <form action={signOut}>
              <button className="rounded-lg p-2 text-ink-2 transition hover:bg-surface-2 hover:text-ink" aria-label="Sign out" title="Sign out">
                <LogOut className="size-[18px]" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
          <Link href={nav[0].href}>
            <Logo area={area} />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Avatar name={user.name} hue={user.hue} size={30} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-lg">
          {bottom.map((item) => {
            const Icon = icons[item.icon];
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-accent" : "text-muted")}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
                {!!item.badge && <span className="absolute top-1.5 left-1/2 ml-2 size-2 rounded-full bg-warm" />}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium", overflowActive ? "text-accent" : "text-muted")}
          >
            <MoreHorizontal className="size-[22px]" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} hue={user.hue} size={36} />
                <div>
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-xs text-muted">{user.email}</div>
                </div>
              </div>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {overflow.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium hover:bg-surface-2">
                    <Icon className="size-5 text-muted" />
                    {item.label}
                  </Link>
                );
              })}
              <ThemeToggle withLabel className="w-full justify-start gap-3 px-3 py-3 text-[15px] font-medium [&_svg]:size-5" />
              <form action={signOut}>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium text-bad hover:bg-surface-2">
                  <LogOut className="size-5" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
