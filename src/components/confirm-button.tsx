"use client";

import type { ComponentProps } from "react";
import { SubmitButton } from "./submit-button";

/** A one-button form that asks before running a destructive action. */
export function ConfirmButton({ action, message, ...props }: { action: () => Promise<void> | void; message: string } & ComponentProps<typeof SubmitButton>) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <SubmitButton {...props} />
    </form>
  );
}
