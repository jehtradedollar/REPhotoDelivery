import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import { ThemeToggle } from "./theme-toggle";

/** Simple centered layout for setup, password reset and invite pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <div className="flex items-center justify-between">
        <span className="font-display text-xl font-medium tracking-tight">{brand.name}</span>
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <h1 className="font-display text-[30px] leading-tight font-medium tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{children}</p>;
}
