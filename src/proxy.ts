import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Middleware uses only the edge-safe config (no MongoDB adapter / Node deps),
// so this bundle never pulls in the `mongodb` driver or `node:*` modules.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!req.auth && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // Run on app routes, skip static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg)$).*)"],
};
