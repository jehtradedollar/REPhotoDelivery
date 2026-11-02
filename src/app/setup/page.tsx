import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell, FormError } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui";
import { setupOwner } from "@/lib/actions";
import { ownerExists } from "@/lib/auth";

export const metadata: Metadata = { title: "Set up your studio" };

// First run only: creates the owner account, then closes for good.
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await ownerExists()) redirect("/login");
  const { error } = await searchParams;
  return (
    <AuthShell title="Set up your studio" subtitle="Create the owner account. You'll invite agents from inside the studio.">
      <form action={setupOwner} className="space-y-4">
        {error === "missing" && <FormError>Enter your name and a valid email.</FormError>}
        {error === "short" && <FormError>Use at least 8 characters for the password.</FormError>}
        <Field label="Your name">
          <Input name="name" autoComplete="name" required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <SubmitButton size="lg" className="w-full">
          Create account
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
