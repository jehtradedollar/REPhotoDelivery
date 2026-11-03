import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema as s } from "@/db";
import { parseStagingResponse } from "@/lib/integrations/staging";
import { applyResult } from "@/lib/staging";

export const runtime = "nodejs";

// The staging vendor calls this when a job finishes. See integrations/staging.ts.
export async function POST(req: NextRequest) {
  const secret = process.env.VIRTUAL_STAGING_WEBHOOK_SECRET;
  const given = req.headers.get("x-staging-secret") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const result = parseStagingResponse(body);
  const reference = String((body as Record<string, unknown> | null)?.reference ?? "");
  const [r] = reference
    ? await db.select().from(s.stagingRequests).where(eq(s.stagingRequests.id, reference))
    : result.jobId
      ? await db.select().from(s.stagingRequests).where(eq(s.stagingRequests.providerJobId, result.jobId))
      : [];
  if (!r) return NextResponse.json({ ok: false, error: "unknown job" }, { status: 404 });
  if (r.status === "done" || r.status === "cancelled") return NextResponse.json({ ok: true });
  await applyResult(r, result);
  return NextResponse.json({ ok: true });
}
