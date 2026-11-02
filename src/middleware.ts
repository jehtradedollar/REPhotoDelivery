import { NextResponse, type NextRequest } from "next/server";

// Coarse gate only; pages still check the role via requireOwner/requireClient.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("rpd_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/studio/:path*", "/portal/:path*"] };
