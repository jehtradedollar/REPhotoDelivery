import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SetPasswordForm } from "@/components/set-password-form";
import { resetPassword } from "@/lib/actions";
import { findValidToken } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const valid = await findValidToken(token, "reset");
  return (
    <AuthShell title="Choose a new password" subtitle={valid ? `For ${valid.user.email}` : undefined}>
      {valid ? (
        <SetPasswordForm action={resetPassword} token={token} error={error} label="Save and sign in" />
      ) : (
        <p className="text-[15px] text-ink-2">
          This link has expired or was already used.{" "}
          <Link href="/forgot" className="font-medium text-accent hover:underline">
            Send a new one
          </Link>
          .
        </p>
      )}
    </AuthShell>
  );
}
