import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/cookie";

/**
 * Coarse gate: bounce unauthenticated requests for app routes to /login.
 * The real check (HMAC verification + user lookup) happens in the page via
 * requireUser(); this just avoids rendering a protected route shell.
 */
const PROTECTED = [/^\/knowledge/, /^\/drafts/, /^\/approvals/, /^\/analytics/];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((re) => re.test(pathname))) return NextResponse.next();

  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/knowledge/:path*", "/drafts/:path*", "/approvals/:path*", "/analytics/:path*"],
};
