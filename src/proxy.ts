import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessAdminPath, homeFor, isAdminPath } from "@/lib/closing/role-access";

const secret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "okun-systems-platform-secret-please-set-NEXTAUTH_SECRET-in-railway";

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const isAuthPage =
    nextUrl.pathname === "/login" ||
    nextUrl.pathname.startsWith("/einladung/") ||
    nextUrl.pathname === "/passwort-vergessen" ||
    nextUrl.pathname.startsWith("/passwort-reset/");
  const isClosingRoute = nextUrl.pathname.startsWith("/closing/");
  const isApiRoute = nextUrl.pathname.startsWith("/api/");

  if (isApiRoute || isClosingRoute) {
    return NextResponse.next();
  }

  // On HTTPS (Railway production), NextAuth uses __Secure- prefix
  const isSecure =
    nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";

  const token = await getToken({
    req,
    secret,
    secureCookie: isSecure,
  });

  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const isAdminOrCloser = role === "ADMIN" || role === "CLOSER";

  if (isLoggedIn && isAuthPage) {
    if (isAdminOrCloser) {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isLoggedIn && nextUrl.pathname === "/") {
    if (isAdminOrCloser) {
      return NextResponse.redirect(new URL(homeFor(role ?? "CLIENT"), nextUrl));
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Bereichsschranke: ein CLOSER darf nur den Sales-/Closing-Bereich betreten.
  // Die maßgebliche Prüfung erfolgt zusätzlich serverseitig gegen die Datenbank
  // (siehe (admin)/layout.tsx und auth-guards.ts) — hier wird nur früh
  // umgeleitet, damit gar nicht erst gerendert wird.
  if (isLoggedIn && isAdminPath(nextUrl.pathname)) {
    if (!isAdminOrCloser) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    if (!canAccessAdminPath(role ?? "", nextUrl.pathname)) {
      return NextResponse.redirect(new URL(homeFor(role ?? "CLIENT"), nextUrl));
    }
  }

  // Der Pfad wird weitergereicht, damit das Layout ihn gegen die in der
  // Datenbank hinterlegte Rolle prüfen kann.
  const headers = new Headers(req.headers);
  headers.set("x-okun-pathname", nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
