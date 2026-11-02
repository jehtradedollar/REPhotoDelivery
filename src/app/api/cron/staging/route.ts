import { NextResponse, type NextRequest } from "next/server";
import { pollStaging } from "@/lib/staging";

export const runtime = "nodejs";
export const maxDuration = 300;

// Optional backstop for vendors without callbacks: call on a schedule with
// Authorization: Bearer {CRON_SECRET} (Vercel Cron sends this automatically).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ checked: await pollStaging() });
}
