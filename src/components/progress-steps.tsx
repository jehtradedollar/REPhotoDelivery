import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Invoice, Project, Shoot } from "@/lib/types";

export function projectSteps(p: Project, shoot?: Shoot, invoice?: Invoice, mediaCount = 0) {
  return [
    { label: "Booked", done: !!shoot && shoot.status !== "requested" },
    { label: "Shot", done: shoot?.status === "completed" || p.status === "editing" || p.status === "delivered" || p.status === "archived" },
    { label: "Uploaded", done: mediaCount > 0 },
    { label: "Delivered", done: p.status === "delivered" || p.status === "archived" },
    { label: "Paid", done: invoice?.status === "paid" },
  ];
}

export function ProgressSteps({ steps }: { steps: { label: string; done: boolean }[] }) {
  const currentIdx = steps.findIndex((s) => !s.done);
  return (
    <ol className="flex items-center">
      {steps.map((s, i) => {
        const current = i === currentIdx;
        return (
          <li key={s.label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full border-2 text-xs font-semibold",
                  s.done ? "border-accent bg-accent text-accent-ink" : current ? "border-accent bg-surface text-accent" : "border-line-strong bg-surface text-muted",
                )}
              >
                {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-[11px] font-medium sm:text-xs", s.done || current ? "text-ink" : "text-muted")}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className={cn("mx-1 mb-5 h-0.5 flex-1 rounded sm:mx-2", s.done ? "bg-accent" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}
