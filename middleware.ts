import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/verify-email"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS.filter((p) => p !== "/").some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/invite/");

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (isPublic) {
    // Logged-in users skip landing/auth pages → dashboard
    if (token && (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // Trial expired and no active subscription → lock to billing.
  const trialEndsAt = token.trialEndsAt ? new Date(token.trialEndsAt) : null;
  const trialExpired = trialEndsAt !== null && trialEndsAt < new Date();
  if (trialExpired && !token.subscriptionActive && pathname !== "/billing") {
    return NextResponse.redirect(new URL("/billing", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
