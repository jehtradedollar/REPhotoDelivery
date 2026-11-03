"use client";

import { useState } from "react";
import { rescheduleShoot } from "@/lib/actions";
import { SubmitButton } from "./submit-button";
import { Button, Input } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");

export function RescheduleForm({ shootId, start }: { shootId: string; start: string }) {
  const d = new Date(start);
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  const [clock, setClock] = useState(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  if (!open)
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Reschedule
      </Button>
    );
  const iso = day && clock ? new Date(`${day}T${clock}:00`).toISOString() : "";
  return (
    <form action={rescheduleShoot.bind(null, shootId)} className="mt-1 w-full space-y-2 rounded-xl border border-line bg-surface-2 p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} required aria-label="New date" />
        <Input type="time" value={clock} step={900} onChange={(e) => setClock(e.target.value)} required aria-label="New time" />
      </div>
      <input type="hidden" name="startIso" value={iso} />
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" name="notify" defaultChecked className="accent-[var(--accent)]" /> Email the agent
      </label>
      <div className="flex gap-2">
        <SubmitButton size="sm">Move shoot</SubmitButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
