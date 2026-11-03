import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { completeGoogleConnect } from "@/lib/integrations/calendar";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "owner") return NextResponse.redirect(new URL("/login", req.url));
  const q = req.nextUrl.searchParams;
  const state = req.cookies.get("google_oauth_state")?.value;
  const done = (result: string) => {
    const res = NextResponse.redirect(new URL(`/studio/settings?google=${result}`, req.url));
    res.cookies.delete("google_oauth_state");
    return res;
  };
  if (!q.get("code") || !state || q.get("state") !== state) return done("error");
  try {
    await completeGoogleConnect(q.get("code")!);
    return done("connected");
  } catch (e) {
    console.error("Google connect failed", e);
    return done("error");
  }
}
