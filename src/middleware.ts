import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // 1. Add Essential Security Headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  // 2. Early Gate for Protected Admin API Routes
  // Rejects requests immediately at the edge if admin token is absent
  if (
    pathname.startsWith("/api/admin/") &&
    !pathname.startsWith("/api/admin/otp/") &&
    pathname !== "/api/admin/logout"
  ) {
    const adminToken =
      request.cookies.get("pocketasset_admin_token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!adminToken) {
      return NextResponse.json(
        {
          error: "Unauthorized: Admin verification token required.",
          code: "ADMIN_AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

