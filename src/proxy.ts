import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // ── Internal brand docs subdomain ─────────────────────────────────────
  // doc.paxawa.com serves the standalone brand guidelines HTML from
  // public/brand/index.html. No auth, no nav link from the main app —
  // the URL is the access control. Handled before the Supabase auth
  // dance below because the asset is static and doesn't need a session.
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("doc.paxawa.com") || host === "doc.localhost:3000") {
    if (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/brand/index.html";
      return NextResponse.rewrite(url);
    }
    // Any non-root request on the doc subdomain stays a 404 — we don't
    // want to leak the main app surface through this host.
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth check if env vars aren't configured yet
  if (!supabaseUrl || supabaseUrl.startsWith("your_") || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  // Dev bypass — skip auth entirely in development mode
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/auth");
  const isInviteRoute = path.startsWith("/invite");
  // Public landing + public share view + public guest accept routes.
  const isPublicPage = path === "/" || path.startsWith("/share/");
  // Internal endpoints that gate themselves (cron secret, health probe).
  // These must be reachable without a session.
  const isPublicApi =
    path === "/api/health" || path.startsWith("/api/cron/");

  if (!user && !isAuthRoute && !isInviteRoute && !isPublicPage && !isPublicApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
