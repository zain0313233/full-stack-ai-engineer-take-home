import { createServerClient } from "@supabase/ssr";
import type { SerializeOptions } from "cookie";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getRateLimitTier } from "@/lib/api/rate-limit";
import { withSecurityHeaders } from "@/lib/api/security-headers";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: SerializeOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isDashboard = pathname.startsWith("/dashboard");

  // All API routes require authentication
  if (isApi) {
    if (!user) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        true
      );
    }

    const tier = getRateLimitTier(pathname, request.method);
    const rateCheck = checkRateLimit(user.id, tier);
    if (!rateCheck.ok) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "Too many requests. Please try again shortly." },
          {
            status: 429,
            headers: { "Retry-After": String(rateCheck.retryAfter) },
          }
        ),
        true
      );
    }
  }

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(supabaseResponse, isApi);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
