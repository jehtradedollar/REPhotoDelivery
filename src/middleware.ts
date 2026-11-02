import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

// Coarse gate: a valid signed cookie is required. Pages still check the role
// and that the account is active via requireOwner / requireClient.
export async function middleware(req: NextRequest) {
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/studio/:path*", "/portal/:path*"] };
