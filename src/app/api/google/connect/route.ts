import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { calendar } from "@/lib/integrations";
import { googleAuthUrl } from "@/lib/integrations/calendar";

export async function GET(req: Request) {
  const session = await getSession();
  if (session?.role !== "owner") return NextResponse.redirect(new URL("/login", req.url));
  if (!calendar.configured) return NextResponse.redirect(new URL("/studio/settings?google=unconfigured", req.url));
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("google_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return res;
}
