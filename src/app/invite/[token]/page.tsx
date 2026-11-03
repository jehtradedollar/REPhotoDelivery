import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SetPasswordForm } from "@/components/set-password-form";
import { acceptInvite } from "@/lib/actions";
import { findValidToken } from "@/lib/auth";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const valid = await findValidToken(token, "invite");
  return (
    <AuthShell
      title={valid ? `Welcome, ${valid.user.name.split(" ")[0]}` : "Invite expired"}
      subtitle={valid ? `Choose a password for ${valid.user.email} to book shoots and get your media from ${brand.name}.` : undefined}
    >
      {valid ? (
        <SetPasswordForm action={acceptInvite} token={token} error={error} label="Create my account" />
      ) : (
        <p className="text-[15px] text-ink-2">
          This invite has expired or was already used. You can{" "}
          <Link href="/forgot" className="font-medium text-accent hover:underline">
            get a new link by email
          </Link>{" "}
          or contact {brand.email}.
        </p>
      )}
    </AuthShell>
  );
}
