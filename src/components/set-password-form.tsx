import { FormError } from "./auth-shell";
import { SubmitButton } from "./submit-button";
import { Field, Input } from "./ui";

const errors: Record<string, string> = {
  short: "Use at least 8 characters.",
  mismatch: "The two passwords don't match.",
  expired: "This link has expired or was already used. Ask for a new one.",
};

export function SetPasswordForm({ action, token, error, label }: { action: (fd: FormData) => Promise<void>; token: string; error?: string; label: string }) {
  return (
    <form action={action} className="space-y-4">
      {error && errors[error] && <FormError>{errors[error]}</FormError>}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" hint="At least 8 characters">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm password">
        <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <SubmitButton size="lg" className="w-full">
        {label}
      </SubmitButton>
    </form>
  );
}
