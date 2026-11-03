import { ArrowRight, Camera, Home } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormError } from "@/components/auth-shell";
import { PropertyImage } from "@/components/property-image";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Field, Input } from "@/components/ui";
import { signIn, signInDemo } from "@/lib/actions";
import { getSession, ownerExists } from "@/lib/auth";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Sign in" };

const errors: Record<string, string> = {
  invalid: "That email and password don't match.",
  locked: "Too many attempts. Wait 15 minutes, or reset your password.",
  inactive: "This account is no longer active. Contact the studio.",
  noseed: "Demo accounts aren't loaded. Run npm run db:seed first.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "", error } = await searchParams;
  if (!(await ownerExists())) redirect("/setup");
  const session = await getSession();
  if (session) redirect(session.role === "owner" ? "/studio" : "/portal");
  const demo = process.env.DEMO_MODE === "true";
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-accent-strong lg:block dark:bg-surface-2">
        <div className="absolute inset-0 grid -rotate-6 scale-125 grid-cols-3 gap-4 opacity-90">
          {[3, 17, 24, 8, 31, 12, 45, 5, 19, 27, 38, 14].map((seed, i) => (
            <div
              key={seed}
              className={`overflow-hidden rounded-2xl shadow-xl ${i % 3 === 1 ? "translate-y-16" : ""}`}
            >
              <div className="aspect-[4/5]">
                <PropertyImage
                  seed={seed}
                  variant={i % 4 === 1 ? "interior" : "exterior"}
                  label=""
                />
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="max-w-md font-display text-[40px] leading-[1.1] font-medium tracking-tight">
            Every listing&apos;s media, in one place.
          </p>
          <p className="mt-3 max-w-md text-[15px] text-white/80">
            Book shoots, review galleries, pay invoices and download
            full-resolution files for each property.
          </p>
        </div>
      </div>

      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-medium tracking-tight">
            {brand.name}
          </span>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-[32px] leading-tight font-medium tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            Sign in to view your properties and media.
          </p>

          <form action={signIn} className="mt-8 space-y-4">
            {error && errors[error] && <FormError>{errors[error]}</FormError>}
            <input type="hidden" name="next" value={next} />
            <Field label="Email">
              <Input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@brokerage.com"
                required
              />
            </Field>
            <Field label="Password">
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </Field>
            <div className="-mt-1 text-right">
              <Link
                href="/forgot"
                className="text-[13px] font-medium text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Button size="lg" className="w-full">
              Sign in <ArrowRight />
            </Button>
          </form>

          {demo && (
            <>
              <div className="my-8 flex items-center gap-3 text-xs font-medium tracking-wide text-muted uppercase">
                <span className="h-px flex-1 bg-line" />
                Demo access
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <form action={signInDemo}>
                  <input type="hidden" name="as" value="owner" />
                  <button className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:border-accent">
                    <Camera className="mt-0.5 size-5 text-accent" />
                    <span>
                      <span className="block text-sm font-semibold">
                        Studio owner
                      </span>
                      <span className="block text-xs text-muted">
                        Manage shoots and clients
                      </span>
                    </span>
                  </button>
                </form>
                <form action={signInDemo}>
                  <input type="hidden" name="as" value="cli_maya" />
                  <button className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:border-accent">
                    <Home className="mt-0.5 size-5 text-accent" />
                    <span>
                      <span className="block text-sm font-semibold">Agent</span>
                      <span className="block text-xs text-muted">
                        View media, book, pay
                      </span>
                    </span>
                  </button>
                </form>
              </div>
              <p className="mt-4 text-xs text-muted">
                Demo mode is on (DEMO_MODE=true). Seeded accounts use the
                password demo1234 unless SEED_PASSWORD was set.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted">
          Need help? {brand.email} · {brand.phone}
        </p>
      </div>
    </div>
  );
}
