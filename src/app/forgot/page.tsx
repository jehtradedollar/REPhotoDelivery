import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui";
import { requestPasswordReset } from "@/lib/actions";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <AuthShell title="Reset your password" subtitle={sent ? undefined : "We'll email you a link to choose a new one."}>
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">If that email has an account, a reset link is on its way. It works for 2 hours.</p>
          <Link href="/login" className="text-sm font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form action={requestPasswordReset} className="space-y-4">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton size="lg" className="w-full">
            Send reset link
          </SubmitButton>
          <Link href="/login" className="block text-center text-sm text-muted hover:text-ink">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
