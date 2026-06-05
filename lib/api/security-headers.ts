import { NextResponse } from "next/server";

export function withSecurityHeaders(response: NextResponse, isApi = false): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isApi) {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}
