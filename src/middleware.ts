import { NextResponse, type NextRequest } from "next/server";

/**
 * Host-based rewrite for the internal brand-guidelines subdomain.
 *
 * `doc.paxawa.com` is a private destination — used by the owner to
 * reference the design system without exposing it through the app
 * footer or any other navigation. The HTML file lives in
 * `public/brand/index.html` (so it's a static asset, no auth, no
 * Next.js render cost). This middleware just translates the
 * subdomain request into that path.
 *
 * Everything else passes through untouched.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";

  if (host.startsWith("doc.paxawa.com") || host === "doc.localhost:3000") {
    // Root → the guideline; anything else on this host stays a 404
    // until we explicitly add more internal pages.
    if (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "") {
      const url = req.nextUrl.clone();
      url.pathname = "/brand/index.html";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on every request except Next.js internals, static files, and
  // the brand asset itself (so the rewrite target isn't re-rewritten).
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|brand/).*)",
  ],
};
