import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { defaultLocale, locales, type Locale } from "./i18n/config";

// Role-based path access control
const adminPaths = ["/admin"];
const leaderPaths = ["/team"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  const publicPaths = ["/login", "/register", "/api/auth"];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Allow static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session token (NextAuth stores it in cookies)
  const token = request.cookies.get("authjs.session-token") ||
                request.cookies.get("__Secure-authjs.session-token");

  // Handle locale from cookie or accept-language header
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value as Locale | undefined;
  let locale: Locale = defaultLocale;

  if (localeCookie && locales.includes(localeCookie)) {
    locale = localeCookie;
  } else {
    // Try to detect from Accept-Language header
    const acceptLanguage = request.headers.get("Accept-Language");
    if (acceptLanguage) {
      const preferredLocale = acceptLanguage
        .split(",")
        .map(lang => lang.split(";")[0].trim().substring(0, 2))
        .find(lang => locales.includes(lang as Locale)) as Locale | undefined;
      if (preferredLocale) {
        locale = preferredLocale;
      }
    }
  }

  // Redirect to login if no token and accessing protected route
  if (!token && !isPublicPath) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Set locale cookie if not present
    if (!localeCookie) {
      response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
    }
    return response;
  }

  // Redirect to calendar if logged in and accessing login/register page
  if (token && (pathname === "/login" || pathname === "/register")) {
    const response = NextResponse.redirect(new URL("/calendar", request.url));
    if (!localeCookie) {
      response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
    }
    return response;
  }

  // Role-based access control for protected paths
  if (token) {
    const jwtToken = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });
    const userRole = jwtToken?.role as string;

    // Admin-only paths
    const isAdminPath = adminPaths.some(p => pathname.startsWith(p));
    if (isAdminPath && userRole !== "admin") {
      const response = NextResponse.redirect(new URL("/unauthorized", request.url));
      if (!localeCookie) {
        response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
      }
      return response;
    }

    // Leader/Admin paths - only leaders and admins can access team management
    const isLeaderPath = leaderPaths.some(p => pathname.startsWith(p));
    if (isLeaderPath && !["admin", "leader"].includes(userRole)) {
      const response = NextResponse.redirect(new URL("/unauthorized", request.url));
      if (!localeCookie) {
        response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
      }
      return response;
    }
  }

  const response = NextResponse.next();
  // Set locale cookie if not present
  if (!localeCookie) {
    response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
