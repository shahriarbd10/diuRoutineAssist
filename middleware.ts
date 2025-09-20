import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  const PUBLIC = ["/", "/student", "/teacher", "/favicon.ico"];
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Guard the admin area only
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Allow login page itself
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  // Check cookie from login
  const cookie = req.cookies.get("ra_admin");
  if (cookie?.value === "yes") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/", "/admin/:path*"] };
