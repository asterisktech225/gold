import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const isAuth = token ? await verifyToken(token) : null;

  const { pathname } = req.nextUrl;

  // Pages protégées
  if (["/live", "/movies", "/series", "/favorites", "/settings"].some(p => pathname.startsWith(p))) {
    if (!isAuth) return NextResponse.redirect(new URL("/login", req.url));
  }

  // Si déjà connecté, redirige depuis /login
  if (pathname === "/login" && isAuth) {
    return NextResponse.redirect(new URL("/live", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/live/:path*", "/movies/:path*", "/series/:path*", "/favorites/:path*", "/settings/:path*", "/login"] };

