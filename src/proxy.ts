import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/cookie";

/**
 * Coarse gate: bounce unauthenticated requests for app routes to /login.
 * The real check (HMAC verification + user lookup) happens in the page via
 * requireUser(); this just avoids rendering a protected route shell.
 *
 * Next 16 renamed the `middleware` convention to `proxy`.
 */
const PROTECTED = [
  /^\/knowledge/,
  /^\/research/,
  /^\/ideas/,
  /^\/hooks/,
  /^\/drafts/,
  /^\/approvals/,
  /^\/analytics/,
  /^\/settings/,
];

export function proxy(req: NextRequest) {
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
  matcher: [
    "/knowledge/:path*",
    "/research/:path*",
    "/ideas/:path*",
    "/hooks/:path*",
    "/drafts/:path*",
    "/approvals/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
